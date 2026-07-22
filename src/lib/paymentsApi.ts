import { apiFetch } from '@/lib/api'

export interface PingOverdueResult {
  ok: boolean
  sent: boolean
  devMode?: boolean
  to?: string
  overdueCount?: number
  amountLabel?: string | null
}

export function pingTenantOverdue(clientId: string) {
  return apiFetch<PingOverdueResult>(`/api/data/clients/${clientId}/ping-overdue`, {
    method: 'POST',
  })
}
