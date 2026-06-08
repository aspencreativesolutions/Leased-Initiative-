import { apiFetch } from '@/lib/api'
import type { ClientInvoice, ProjectTimelineStep } from '@/types'

export async function fetchClientTimeline(clientId: string) {
  return apiFetch<{
    steps: ProjectTimelineStep[]
    finalInvoice: ClientInvoice | null
  }>(`/api/data/clients/${clientId}/timeline`)
}

export async function confirmClientPayment(clientId: string) {
  return apiFetch<{ ok: boolean; depositPaymentConfirmedAt: string }>(
    `/api/data/clients/${clientId}/confirm-payment`,
    { method: 'POST' }
  )
}

export async function skipTimelineToStep(
  clientId: string,
  payload: { targetStepId: string; addNote?: boolean; note?: string }
) {
  return apiFetch<{
    ok: boolean
    skippedStepIds: string[]
    targetStepId: string
    targetLabel: string
    noteId?: string
  }>(`/api/data/clients/${clientId}/timeline/skip`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function completeClientProject(clientId: string) {
  return apiFetch<{
    ok: boolean
    projectCompletedAt: string
    finalInvoice: ClientInvoice
  }>(`/api/data/clients/${clientId}/complete-project`, { method: 'POST' })
}
