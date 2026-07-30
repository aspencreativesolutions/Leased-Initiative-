import { apiFetch } from '@/lib/api'
import type { AuthResponse, PaymentProvider, RegisterResponse, User } from '@/types'

export async function verifyEmail(token: string) {
  return apiFetch<AuthResponse & { alreadyVerified?: boolean }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function resendVerificationEmail(email: string) {
  return apiFetch<{ ok: boolean; message: string; devMode?: boolean }>(
    '/api/auth/resend-verification',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  )
}

export type LandlordPropertyDetail = {
  address: string
  maxTenants: number
  availableSpots: number
  occupied: number
  furnished?: boolean
  monthlyRent?: number | null
  /** Total rent ÷ max occupancy when both are known */
  costPerPersonAtMax?: number | null
  depositAmount?: number | null
  pricingStructure?: 'room' | 'person' | 'bed' | null
  /** Whether utilities are included in the total monthly rent */
  utilitiesIncluded?: boolean
  /** Landlord offers only entire-home placements */
  entireHomeOnly?: boolean
  /** Furnished sleeping inventory for the applicant panel */
  placementInventory?: {
    pricingStructure: 'room' | 'person' | 'bed'
    entireHomeOnly: boolean
    bedrooms: {
      id: string
      label: string
      privacy: 'private' | 'shared'
      placements: {
        id: string
        kind: 'bed' | 'room'
        bedroomId: string
        bedroomLabel: string
        bedId?: string
        bedLabel?: string
        bedSizeLabel?: string
        capacity: 1 | 2
        privacy: 'private' | 'shared'
        monthlyRent: number | null
        occupied: boolean
        openSlots: number
        assignedCount: number
        possibleRoommates: number
      }[]
    }[]
  } | null
}

export async function fetchLandlordCompanies() {
  return apiFetch<{
    companies: string[]
    agencies: {
      name: string
      properties: string[]
      propertyDetails?: LandlordPropertyDetail[]
      discoveryMode?: string
    }[]
  }>('/api/auth/landlord-companies')
}

export type PublicTenantInvite = {
  inviteToken?: string
  landlordCompany: string
  propertyAddress: string | null
  leaseStartDate?: string | null
  leaseLengthMonths?: number | null
  connectionCode?: string | null
  rentalCategory?: 'student_housing' | 'standard_rental' | null
  agency?: {
    name: string
    properties: string[]
    propertyDetails?: LandlordPropertyDetail[]
    discoveryMode?: string
  } | null
  discoveryMode?: string
}

export async function fetchTenantInvite(token: string) {
  return apiFetch<PublicTenantInvite>(`/api/auth/invite/${encodeURIComponent(token)}`)
}

export async function fetchTenantInviteByCode(code: string) {
  return apiFetch<PublicTenantInvite>(`/api/auth/invite-code/${encodeURIComponent(code)}`)
}

export async function claimTenantInvite(input: {
  inviteToken?: string
  connectionCode?: string
  name: string
  email: string
  password: string
  preferredPropertyAddress: string
  preferredLeaseStartDate: string
  preferredPaymentMethod: PaymentProvider
  renterCategory?: 'student' | 'standard'
  acceptedTermsOfService: true
}) {
  return apiFetch<{ token: string; user: User }>('/api/auth/claim-invite', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function registerAccount(payload: {
  name: string
  email: string
  password: string
  accountType?: 'client' | 'admin'
  companyName?: string
  portalThemeId?: string
  preferredLeaseMonths?: number
  preferredLandlordCompany?: string
  preferredPropertyAddress?: string
  renterCategory?: 'student' | 'standard'
  inviteToken?: string
  connectionCode?: string
  acceptedTermsOfService: true
}) {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
