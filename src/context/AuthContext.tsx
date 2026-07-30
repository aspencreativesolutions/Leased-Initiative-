import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthResponse, User } from '@/types'
import { ApiError, apiFetch, getToken, setToken } from '@/lib/api'
import { registerAccount } from '@/lib/authApi'
import {
  clearPublicDemoSession,
  isPublicDemoSession,
  markPublicDemoRecoverHome,
  PUBLIC_DEMO_RECOVER_HOME_KEY,
  tokenLooksLikePublicDemo,
} from '@/lib/publicDemo'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (
    email: string,
    password: string,
    options?: { publicDemo?: boolean }
  ) => Promise<User>
  register: (
    name: string,
    email: string,
    password: string,
    options: {
      accountType?: 'client' | 'admin'
      companyName?: string
      portalThemeId?: string
      preferredLeaseMonths?: number
      preferredLandlordCompany?: string
      preferredPropertyAddress?: string
      renterCategory?: 'student' | 'standard'
      inviteToken?: string
      connectionCode?: string
      acceptedTermsOfService: true
    }
  ) => Promise<{ email: string }>
  updateProfile: (name: string) => Promise<User>
  refreshUser: () => Promise<User | null>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  logout: (options?: { preservePublicDemo?: boolean }) => void
  isAdmin: boolean
  isClient: boolean
  isPublicDemo: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_ME_RETRY_ATTEMPTS = 6
const AUTH_ME_RETRY_BASE_MS = 350

function isRetryableAuthError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true
  // Auth is permanently invalid — don't keep retrying.
  if (err.status === 401 || err.status === 403 || err.status === 404) return false
  // Network blips / API restarts during live updates are retryable.
  return err.status === 0 || err.status >= 500
}

async function fetchCurrentUserWithRetry(): Promise<User> {
  let lastError: unknown
  for (let attempt = 0; attempt < AUTH_ME_RETRY_ATTEMPTS; attempt++) {
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me')
      return data.user
    } catch (err) {
      lastError = err
      if (!isRetryableAuthError(err) || attempt === AUTH_ME_RETRY_ATTEMPTS - 1) {
        throw err
      }
      await new Promise((resolve) =>
        window.setTimeout(resolve, AUTH_ME_RETRY_BASE_MS * (attempt + 1))
      )
    }
  }
  throw lastError
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback((options?: { preservePublicDemo?: boolean }) => {
    setToken(null)
    setUser(null)
    if (!options?.preservePublicDemo) {
      clearPublicDemoSession()
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, options?: { publicDemo?: boolean }) => {
      const publicDemo = options?.publicDemo === true
      const data = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, publicDemo }),
      })
      setToken(data.token)
      setUser(data.user)
      return data.user
    },
    []
  )

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      options: {
        accountType?: 'client' | 'admin'
        companyName?: string
        portalThemeId?: string
        preferredLeaseMonths?: number
        preferredLandlordCompany?: string
        preferredPropertyAddress?: string
        renterCategory?: 'student' | 'standard'
        inviteToken?: string
        connectionCode?: string
        acceptedTermsOfService: true
      }
    ) => {
      const data = await registerAccount({
        name,
        email,
        password,
        accountType: options.accountType ?? 'client',
        companyName: options.companyName,
        portalThemeId: options.portalThemeId,
        preferredLeaseMonths: options.preferredLeaseMonths,
        preferredLandlordCompany: options.preferredLandlordCompany,
        preferredPropertyAddress: options.preferredPropertyAddress,
        renterCategory: options.renterCategory,
        inviteToken: options.inviteToken,
        connectionCode: options.connectionCode,
        acceptedTermsOfService: options.acceptedTermsOfService,
      })
      return { email: data.email }
    },
    []
  )

  const updateProfile = useCallback(async (name: string) => {
    const data = await apiFetch<{ user: User }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    setUser(data.user)
    return data.user
  }, [])

  const failSession = useCallback(
    (token: string | null) => {
      const wasPublicDemo =
        isPublicDemoSession() || tokenLooksLikePublicDemo(token)
      logout()
      if (wasPublicDemo) markPublicDemoRecoverHome()
    },
    [logout]
  )

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      return null
    }
    try {
      const me = await fetchCurrentUserWithRetry()
      setUser(me)
      if (me.publicDemo === true || isPublicDemoSession()) {
        try {
          sessionStorage.removeItem(PUBLIC_DEMO_RECOVER_HOME_KEY)
        } catch {
          /* ignore */
        }
      }
      return me
    } catch {
      failSession(token)
      return null
    }
  }, [failSession])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await apiFetch('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
    },
    []
  )

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchCurrentUserWithRetry()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        if (me.publicDemo === true || isPublicDemoSession()) {
          try {
            sessionStorage.removeItem(PUBLIC_DEMO_RECOVER_HOME_KEY)
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        if (!cancelled) failSession(token)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [failSession])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      updateProfile,
      refreshUser,
      changePassword,
      logout,
      isAdmin: user?.role === 'admin',
      isClient: user?.role === 'client',
      // Session flag covers race/hydration cases where the JWT user object
      // hasn’t yet exposed `publicDemo` (tour must stay optional in demo).
      isPublicDemo: user?.publicDemo === true || isPublicDemoSession(),
    }),
    [user, loading, login, register, updateProfile, refreshUser, changePassword, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
