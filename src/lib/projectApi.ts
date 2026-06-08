import { apiFetch } from '@/lib/api'

export async function startClientProject(clientId: string) {
  return apiFetch<{ ok: boolean; projectStartedAt: string }>(
    `/api/data/clients/${clientId}/start-project`,
    { method: 'POST' }
  )
}
