import { apiFetch } from '@/lib/api'

export async function trackPaymentLinkClick() {
  return apiFetch<{ ok: boolean; paymentStatus?: string }>('/api/portal/invoice/click', {
    method: 'POST',
  })
}
