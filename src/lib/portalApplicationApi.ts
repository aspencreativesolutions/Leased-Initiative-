import { apiFetch } from '@/lib/api'
import type { PaymentProvider, PortalDashboard } from '@/types'

export async function submitPortalApplication(input: {
  preferredLandlordCompany: string
  preferredPropertyAddress: string
  preferredLeaseMonths: number
  preferredOccupancyMode?: 'full_rent' | 'roommates'
  roommateInvitePhones?: string[]
  inviteToken?: string
  connectionCode?: string
}) {
  return apiFetch<PortalDashboard>('/api/portal/application', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function claimPortalInvite(input: {
  inviteToken?: string
  connectionCode?: string
  preferredPropertyAddress: string
  preferredLeaseStartDate?: string
  preferredLeaseMonths?: number
  preferredPaymentMethod?: PaymentProvider
}) {
  return apiFetch<PortalDashboard>('/api/portal/claim-invite', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
