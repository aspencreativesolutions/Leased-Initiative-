import { apiFetch } from '@/lib/api'
import type { ClientNotification } from '@/types'

export async function fetchClientNotifications() {
  return apiFetch<{ notifications: ClientNotification[]; count: number }>(
    '/api/portal/notifications'
  )
}

export async function markClientNotificationsRead(ids?: string[]) {
  return apiFetch<{ ok: boolean }>('/api/portal/notifications/read', {
    method: 'POST',
    body: JSON.stringify(ids ? { ids } : {}),
  })
}
