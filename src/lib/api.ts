import { getAdminUnlockHeader } from '@/lib/adminUnlock'
import { safeLocalGet, safeLocalRemove, safeLocalSet } from '@/lib/safeStorage'

const TOKEN_KEY = 'client-craft-token'

export function getToken(): string | null {
  return safeLocalGet(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) safeLocalSet(TOKEN_KEY, token)
  else safeLocalRemove(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  email?: string

  constructor(
    message: string,
    status: number,
    extra?: { code?: string; email?: string }
  ) {
    super(message)
    this.status = status
    this.code = extra?.code
    this.email = extra?.email
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (path.startsWith('/api/dev')) {
    const unlock = getAdminUnlockHeader()
    if (unlock) headers['X-Leased-Admin-Unlock'] = unlock
  }

  const serverDownMessage =
    'API server is not running — stop the app (Ctrl+C in your terminal) and run npm run dev again.'

  let res: Response
  try {
    res = await fetch(path, { ...options, headers })
  } catch {
    throw new ApiError(serverDownMessage, 0)
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    let message = data.error || res.statusText || 'Request failed'
    if (!data.error && res.status === 404 && path.startsWith('/api')) {
      message =
        'API route not found — stop the app (Ctrl+C) and run npm run dev again to load the latest server code.'
    } else if (
      res.status === 500 &&
      !data.error &&
      path.startsWith('/api')
    ) {
      message = serverDownMessage
    } else if (res.status === 0 || message === 'Failed to fetch') {
      message = serverDownMessage
    }
    throw new ApiError(message, res.status, {
      code: data.code,
      email: data.email,
    })
  }
  return data as T
}
