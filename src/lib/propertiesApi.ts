import { apiFetch } from '@/lib/api'
import type {
  Property,
  PropertyAddressDetails,
  PropertyBedroom,
  PropertyHousingType,
} from '@/types'

export type PropertyWriteInput = {
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  unitCount?: number
  bedroomsLayout?: PropertyBedroom[]
  monthlyRent?: number
  importedFromLeaseScan?: boolean
  addressConfirmed?: boolean
  addressDetails?: PropertyAddressDetails
}

export async function createProperty(input: PropertyWriteInput) {
  return apiFetch<{ property: Property; properties: Property[] }>('/api/data/properties', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updatePropertyRequest(propertyId: string, input: PropertyWriteInput) {
  return apiFetch<{ property: Property; properties: Property[] }>(
    `/api/data/properties/${encodeURIComponent(propertyId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )
}

export async function logResignMessage(clientId: string, message?: string) {
  return apiFetch<{ ok: boolean }>(`/api/data/clients/${clientId}/resign-message`, {
    method: 'POST',
    body: JSON.stringify({ message: message ?? '' }),
  })
}
