import { apiFetch } from '@/lib/api'

export interface ClientAccount {
  id: string
  name: string
  email: string
  createdAt: string
  clientId: string | null
  clientName: string | null
  linked: boolean
}

export async function fetchClientAccounts() {
  return apiFetch<{ accounts: ClientAccount[]; count: number }>('/api/data/client-accounts')
}

export async function deleteClientAccount(userId: string) {
  return apiFetch<{ ok: boolean; deletedClientId?: string }>(
    `/api/data/client-accounts/${userId}`,
    { method: 'DELETE' }
  )
}

export async function removeClientRecord(clientId: string) {
  return apiFetch<{ ok: boolean; accountKept: boolean }>(
    `/api/data/clients/${clientId}`,
    { method: 'DELETE' }
  )
}

/** Soft-remove: move expired official tenant to Past Tenants (Company Profile). */
export async function archiveClientRecord(
  clientId: string,
  options?: { force?: boolean }
) {
  return apiFetch<{ ok: boolean; client: { id: string; archivedAt: string } }>(
    `/api/data/clients/${clientId}/archive`,
    {
      method: 'POST',
      body: JSON.stringify({ force: options?.force === true }),
    }
  )
}
