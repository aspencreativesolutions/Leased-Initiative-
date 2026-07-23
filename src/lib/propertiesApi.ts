import { apiFetch } from '@/lib/api'
import type { Property, PropertyAddressDetails, PropertyHousingType } from '@/types'

export async function createProperty(input: {
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  unitCount?: number
  importedFromLeaseScan?: boolean
  addressConfirmed?: boolean
  addressDetails?: PropertyAddressDetails
}) {
  return apiFetch<{ property: Property; properties: Property[] }>('/api/data/properties', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function logResignMessage(clientId: string, message?: string) {
  return apiFetch<{ ok: boolean }>(`/api/data/clients/${clientId}/resign-message`, {
    method: 'POST',
    body: JSON.stringify({ message: message ?? '' }),
  })
}
