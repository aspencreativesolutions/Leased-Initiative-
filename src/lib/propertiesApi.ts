import { apiFetch } from '@/lib/api'
import type {
  Property,
  PropertyAddressDetails,
  PropertyBedroom,
  PropertyHousingType,
  PropertyPricingStructure,
  RentalCategory,
} from '@/types'

export type PropertyWriteInput = {
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  unitCount?: number
  bedroomsLayout?: PropertyBedroom[]
  monthlyRent?: number
  furnished?: boolean
  pricingStructure?: PropertyPricingStructure
  /** Security deposit; pass null to clear when editing. */
  depositAmount?: number | null
  /** Whether utilities are included in total monthly rent. */
  utilitiesIncluded?: boolean
  /** When true, applicants may only rent the entire home. */
  entireHomeOnly?: boolean
  /** Default lease calendar option id from Settings (`seasonal-12`, custom era id). */
  defaultLeaseOptionId?: string | null
  /**
   * Per-rental condition report override.
   * `true` / `false` force required or optional; `null` clears to account default.
   */
  conditionReportRequired?: boolean | null
  importedFromLeaseScan?: boolean
  addressConfirmed?: boolean
  addressDetails?: PropertyAddressDetails
  /** Student Housing vs Standard Rental. */
  rentalCategory?: RentalCategory
  /** When true, rental is off market (no new applications). */
  offMarket?: boolean
  /** Optional reason shown on the off-market overlay; null clears. */
  offMarketReason?: string | null
  /** ISO timestamp when taken off market; null clears when returning to market. */
  offMarketAt?: string | null
}

/** Build a full write payload from an existing rental, with optional overrides. */
export function propertyToWriteInput(
  property: Property,
  overrides: Partial<PropertyWriteInput> = {}
): PropertyWriteInput {
  return {
    address: property.address,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    maxTenants: property.maxTenants,
    unitCount: property.unitCount,
    ...(property.bedroomsLayout ? { bedroomsLayout: property.bedroomsLayout } : {}),
    ...(property.monthlyRent != null ? { monthlyRent: property.monthlyRent } : {}),
    furnished: property.furnished === true,
    ...(property.pricingStructure
      ? { pricingStructure: property.pricingStructure }
      : {}),
    depositAmount:
      property.depositAmount != null && property.depositAmount > 0
        ? property.depositAmount
        : null,
    utilitiesIncluded: property.utilitiesIncluded === true,
    entireHomeOnly: property.entireHomeOnly === true,
    defaultLeaseOptionId: property.defaultLeaseOptionId ?? null,
    conditionReportRequired:
      property.conditionReportRequired === true
        ? true
        : property.conditionReportRequired === false
          ? false
          : null,
    addressConfirmed: true,
    ...(property.addressDetails ? { addressDetails: property.addressDetails } : {}),
    ...(property.rentalCategory ? { rentalCategory: property.rentalCategory } : {}),
    offMarket: property.offMarket === true,
    offMarketReason: property.offMarketReason?.trim() || null,
    offMarketAt: property.offMarketAt ?? null,
    ...overrides,
  }
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
