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
import { apiFetch, getToken, setToken } from '@/lib/api'
import { registerAccount } from '@/lib/authApi'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (
    name: string,
    email: string,
    password: string,
    options?: { accountType?: 'client' | 'admin'; portalThemeId?: string }
  ) => Promise<{ email: string }>
  updateProfile: (name: string) => Promise<User>
  refreshUser: () => Promise<User | null>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      options?: { accountType?: 'client' | 'admin'; portalThemeId?: string }
    ) => {
      const data = await registerAccount({
        name,
        email,
        password,
        accountType: options?.accountType ?? 'client',
        portalThemeId: options?.portalThemeId,
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

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      return null
    }
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me')
      setUser(data.user)
      return data.user
    } catch {
      logout()
      return null
    }
  }, [logout])

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
    apiFetch<{ user: User }>('/api/auth/me')
      .then(({ user: me }) => setUser(me))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

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
