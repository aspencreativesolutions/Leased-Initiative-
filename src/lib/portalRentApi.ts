import { apiFetch } from '@/lib/api'
import type { PortalInvoice } from '@/types'

export function createPortalRentInvoice(monthCount: number) {
  return apiFetch<{ invoice: PortalInvoice }>('/api/portal/rent-invoice', {
    method: 'POST',
    body: JSON.stringify({ monthCount }),
  })
}
