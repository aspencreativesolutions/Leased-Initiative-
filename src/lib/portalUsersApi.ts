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

export async function acceptRegistration(
  userId: string,
  options?: { draftLease?: boolean }
) {
  return apiFetch<{
    client: { id: string }
    contract: { id: string } | null
    reusedLease?: boolean
    draftLease?: boolean
    leaseAction?: 'draft' | 'send' | 'view' | 'generating'
  }>(`/api/data/accept-registration/${userId}`, {
    method: 'POST',
    body: JSON.stringify({
      draftLease: options?.draftLease !== false,
    }),
  })
}

export type CreateTenantInviteInput = {
  propertyAddress?: string
  leaseStartDate?: string
  leaseLengthMonths?: number
  connectionCode?: string
  phone?: string
  sendSms?: boolean
  clientId?: string
  source?: 'lease-import' | 'manual'
}

export type TenantInviteResult = {
  invite: {
    id: string
    landlordCompany: string
    propertyAddress: string | null
    leaseStartDate?: string | null
    leaseLengthMonths?: number | null
    connectionCode: string | null
    expiresAt: string
    source?: string
    status?: string
    deliveryMethod?: string | null
    deliveryDestination?: string | null
  }
  inviteUrl: string
  connectionCode: string | null
  sms?: { sent: boolean; devMode?: boolean; to?: string | null } | null
}

export async function createTenantInvite(
  propertyAddressOrOptions?: string | CreateTenantInviteInput,
  options?: { clientId?: string; source?: 'lease-import' | 'manual' }
) {
  const body: CreateTenantInviteInput =
    typeof propertyAddressOrOptions === 'string' || propertyAddressOrOptions == null
      ? {
          ...(propertyAddressOrOptions ? { propertyAddress: propertyAddressOrOptions } : {}),
          ...(options?.clientId ? { clientId: options.clientId } : {}),
          ...(options?.source ? { source: options.source } : {}),
        }
      : propertyAddressOrOptions

  return apiFetch<TenantInviteResult>('/api/data/tenant-invites', {
    method: 'POST',
    body: JSON.stringify(body),
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
