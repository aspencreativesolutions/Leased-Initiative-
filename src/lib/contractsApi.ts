import { apiFetch } from '@/lib/api'
import type { AdminAuditEntry } from '@/types'

export interface DeleteContractResult {
  ok: boolean
  message: string
  auditEntry: AdminAuditEntry
  clientId: string
}

export async function permanentlyDeleteContract(
  contractId: string,
  confirmContractId: string
): Promise<DeleteContractResult> {
  return apiFetch<DeleteContractResult>(`/api/contracts/${contractId}/permanent-delete`, {
    method: 'POST',
    body: JSON.stringify({ confirmContractId }),
  })
}

export async function permanentlyDeleteClientContract(
  clientId: string,
  confirmClientId: string
): Promise<DeleteContractResult> {
  return apiFetch<DeleteContractResult>(`/api/data/clients/${clientId}/permanent-delete-contract`, {
    method: 'POST',
    body: JSON.stringify({ confirmClientId }),
  })
}

export async function fetchAdminAuditLog(options?: {
  type?: string
  limit?: number
}): Promise<{ entries: AdminAuditEntry[]; count: number }> {
  const params = new URLSearchParams()
  if (options?.type) params.set('type', options.type)
  if (options?.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return apiFetch<{ entries: AdminAuditEntry[]; count: number }>(
    `/api/data/audit-log${query ? `?${query}` : ''}`
  )
}
