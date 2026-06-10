import { apiFetch } from '@/lib/api'

export interface SquareVerifyResponse {
  clientId: string
  amount: string
  currency: string
  orderId: string
  captureId?: string
  provider: 'square'
  status: string
}

export async function verifySquareOrder(orderId: string): Promise<SquareVerifyResponse> {
  return apiFetch<SquareVerifyResponse>('/api/square/verify-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  })
}

/** After Square redirect — finds the logged-in client's pending Square order */
export async function verifySquarePendingPayment(): Promise<SquareVerifyResponse> {
  return apiFetch<SquareVerifyResponse>('/api/portal/verify-square-payment', {
    method: 'POST',
  })
}

export async function checkSquareHealth(): Promise<{ ok: boolean; mode: string }> {
  return apiFetch('/api/square/health')
}
