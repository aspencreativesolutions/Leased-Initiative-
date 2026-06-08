const TOKEN_KEY = 'client-craft-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
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

  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    let message = data.error || res.statusText || 'Request failed'
    if (!data.error && res.status === 404 && path.startsWith('/api')) {
      message =
        'API route not found — the server may be out of date. Restart with npm run desktop:stop && npm run desktop'
    } else if (res.status === 0 || message === 'Failed to fetch') {
      message =
        'API server unavailable — restart with npm run desktop:stop && npm run desktop'
    }
    throw new ApiError(message, res.status)
  }
  return data as T
}
