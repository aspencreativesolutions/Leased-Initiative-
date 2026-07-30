import { apiFetch } from '@/lib/api'
import type { ZelleCadence } from '@/types'

export type ZelleInvoiceType = 'deposit' | 'final' | 'rent'

export interface PortalZellePayPayload {
  invoiceType: ZelleInvoiceType
  amount: number
  currency: string
  description: string
  dueDates: string[]
  monthCount?: number
  zelleMemo?: string
  zelleMarkedPaidAt?: string
  paidAt?: string
  zelleHandle: string
  zelleDisplayName: string | null
  zelleCadence: ZelleCadence
  zelleAutoGuidedAt: string | null
  landlordName: string
}

export function fetchPortalZellePay(invoiceType: ZelleInvoiceType) {
  return apiFetch<PortalZellePayPayload>(`/api/portal/zelle/${invoiceType}`)
}

export function markPortalZellePaid(invoiceType: ZelleInvoiceType) {
  return apiFetch<{ ok: true; zelleMarkedPaidAt: string }>(
    `/api/portal/zelle/${invoiceType}/mark-paid`,
    { method: 'POST' }
  )
}

export function setPortalZelleCadence(input: {
  cadence: ZelleCadence
  completeGuide?: boolean
}) {
  return apiFetch<{
    ok: true
    zelleCadence: ZelleCadence
    zelleAutoGuidedAt: string | null
  }>('/api/portal/zelle/cadence', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
