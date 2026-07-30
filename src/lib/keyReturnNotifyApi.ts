import { apiFetch } from '@/lib/api'

export function requestKeyReturnNotification(clientId: string) {
  return apiFetch<{ ok: boolean; notified: boolean; message?: string }>(
    `/api/data/clients/${encodeURIComponent(clientId)}/request-key-return`,
    { method: 'POST' }
  )
}
