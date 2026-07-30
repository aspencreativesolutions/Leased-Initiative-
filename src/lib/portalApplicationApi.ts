import { apiFetch } from '@/lib/api'
import type {
  ApplicantPartyType,
  CoupleCompanion,
  PaymentProvider,
  PortalDashboard,
  PreferredOccupancyMode,
  RenterCategory,
} from '@/types'

export async function submitPortalApplication(input: {
  preferredLandlordCompany: string
  preferredPropertyAddress: string
  preferredLeaseMonths: number
  preferredOccupancyMode?: PreferredOccupancyMode
  preferredBedroomId?: string
  preferredBedId?: string
  roommateInvitePhones?: string[]
  roommateInviteDelivery?: 'group' | 'solo'
  applicantPartyType?: ApplicantPartyType
  coupleCompanion?: CoupleCompanion
  renterCategory?: RenterCategory
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
