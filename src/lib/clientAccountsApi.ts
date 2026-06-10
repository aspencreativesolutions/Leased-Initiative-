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
