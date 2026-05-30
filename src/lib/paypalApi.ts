import type { PayPalCaptureResponse, PayPalCreateOrderResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`)
  }
  return data as T
}

export function isPayPalConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID)
}

export async function createPayPalOrder(params: {
  clientId: string
  amount: number
  currency?: string
  description: string
}): Promise<PayPalCreateOrderResponse> {
  return api<PayPalCreateOrderResponse>('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResponse> {
  return api<PayPalCaptureResponse>('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  })
}

export async function checkPayPalHealth(): Promise<{ ok: boolean; mode?: string }> {
  try {
    return await api('/api/paypal/health')
  } catch {
    return { ok: false }
  }
}
