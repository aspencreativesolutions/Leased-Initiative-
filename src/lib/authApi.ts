import { apiFetch } from '@/lib/api'
import type { AuthResponse, RegisterResponse } from '@/types'

export async function verifyEmail(token: string) {
  return apiFetch<AuthResponse & { alreadyVerified?: boolean }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function resendVerificationEmail(email: string) {
  return apiFetch<{ ok: boolean; message: string; devMode?: boolean }>(
    '/api/auth/resend-verification',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  )
}

export async function fetchLandlordCompanies() {
  return apiFetch<{
    companies: string[]
    agencies: { name: string; properties: string[] }[]
  }>('/api/auth/landlord-companies')
}

export async function fetchTenantInvite(token: string) {
  return apiFetch<{
    landlordCompany: string
    propertyAddress: string | null
    connectionCode?: string | null
    agency?: { name: string; properties: string[]; discoveryMode?: string } | null
    discoveryMode?: string
  }>(`/api/auth/invite/${encodeURIComponent(token)}`)
}

export async function fetchTenantInviteByCode(code: string) {
  return apiFetch<{
    inviteToken: string
    landlordCompany: string
    propertyAddress: string | null
    connectionCode?: string | null
    agency?: { name: string; properties: string[]; discoveryMode?: string } | null
    discoveryMode?: string
  }>(`/api/auth/invite-code/${encodeURIComponent(code)}`)
}

export async function registerAccount(payload: {
  name: string
  email: string
  password: string
  accountType?: 'client' | 'admin'
  companyName?: string
  portalThemeId?: string
  preferredLeaseMonths?: number
  preferredLandlordCompany?: string
  preferredPropertyAddress?: string
  inviteToken?: string
  connectionCode?: string
}) {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
