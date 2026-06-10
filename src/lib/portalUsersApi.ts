import { apiFetch } from '@/lib/api'
import type { PortalUsersOverview } from '@/types'

export async function fetchPortalUsers() {
  return apiFetch<PortalUsersOverview>('/api/data/portal-users')
}

export async function dismissRegistration(userId: string) {
  return apiFetch<{ ok: boolean }>(`/api/data/dismiss-registration/${userId}`, {
    method: 'POST',
  })
}

export async function acceptRegistration(userId: string) {
  return apiFetch<{
    client: { id: string }
    contract: { id: string } | null
  }>(`/api/data/accept-registration/${userId}`, {
    method: 'POST',
  })
}
