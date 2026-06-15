import { apiFetch } from '@/lib/api'

export async function sendInvoiceToPortal(clientId: string) {
  return apiFetch<{ ok: boolean; message: string; sentToPortalAt: string }>(
    `/api/invoices/${clientId}/send`,
    { method: 'POST' }
  )
}

export async function generateDepositInvoice(clientId: string) {
  return apiFetch<{ ok: boolean; invoice: Record<string, unknown> }>(
    `/api/invoices/${clientId}/generate`,
    { method: 'POST' }
  )
}

export async function sendFinalInvoiceToPortal(clientId: string) {
  return apiFetch<{ ok: boolean; message: string; sentToPortalAt: string }>(
    `/api/invoices/${clientId}/send-final`,
    { method: 'POST' }
  )
}

export async function generateFinalInvoice(clientId: string) {
  return apiFetch<{ ok: boolean; finalInvoice: Record<string, unknown> }>(
    `/api/invoices/${clientId}/generate-final`,
    { method: 'POST' }
  )
}
