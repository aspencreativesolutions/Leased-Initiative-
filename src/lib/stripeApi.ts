import { apiFetch } from '@/lib/api'

export interface StripeVerifyResponse {
  clientId: string
  amount: string
  currency: string
  orderId: string
  captureId?: string
  provider: 'stripe'
  status: string
}

export async function verifyStripeSession(sessionId: string): Promise<StripeVerifyResponse> {
  return apiFetch<StripeVerifyResponse>('/api/stripe/verify-session', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function checkStripeHealth(): Promise<{ ok: boolean; mode: string }> {
  return apiFetch('/api/stripe/health')
}
