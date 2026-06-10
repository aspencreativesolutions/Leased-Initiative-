import { apiFetch } from '@/lib/api'
import type { AuthResponse, RegisterResponse } from '@/types'

export async function verifyEmail(token: string) {
  return apiFetch<AuthResponse & { alreadyVerified?: boolean }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function resendVerificationEmail(email: string) {
  return apiFetch<{ ok: boolean; message: string }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function registerAccount(payload: {
  name: string
  email: string
  password: string
  accountType?: 'client' | 'admin'
  portalThemeId?: string
}) {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
