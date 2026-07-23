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
    reusedLease?: boolean
    leaseAction?: 'draft' | 'send' | 'view'
  }>(`/api/data/accept-registration/${userId}`, {
    method: 'POST',
  })
}

export async function createTenantInvite(
  propertyAddress?: string,
  options?: { clientId?: string; source?: 'lease-import' | 'manual' }
) {
  return apiFetch<{
    invite: {
      id: string
      landlordCompany: string
      propertyAddress: string | null
      expiresAt: string
      source?: string
      status?: string
    }
    inviteUrl: string
  }>('/api/data/tenant-invites', {
    method: 'POST',
    body: JSON.stringify({
      ...(propertyAddress ? { propertyAddress } : {}),
      ...(options?.clientId ? { clientId: options.clientId } : {}),
      ...(options?.source ? { source: options.source } : {}),
    }),
  })
}

export async function markTenantInviteDelivered(
  inviteId: string,
  delivery: { method: 'email' | 'sms'; destination?: string }
) {
  return apiFetch<{
    ok: boolean
    invite: {
      id: string
      deliveryMethod: string | null
      deliveryDestination: string | null
      deliveredAt: string | null
      status: string
      expiresAt: string
    }
  }>(`/api/data/tenant-invites/${encodeURIComponent(inviteId)}/delivered`, {
    method: 'POST',
    body: JSON.stringify(delivery),
  })
}
