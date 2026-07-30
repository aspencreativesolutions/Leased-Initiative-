import type { PropertyHousingType } from '@/types'
import { PROPERTY_HOUSING_TYPES } from '@/types'

export interface RentalTypeOption {
  value: PropertyHousingType
  description: string
}

/** Rental type choices with landlord-facing descriptions. */
export const RENTAL_TYPE_OPTIONS: RentalTypeOption[] = [
  {
    value: 'Apartment',
    description:
      'An individual rental unit inside a larger apartment building or complex.',
  },
  {
    value: 'Condominium (Condo)',
    description:
      'An individually owned residential unit located within a condominium building or community.',
  },
  {
    value: 'Single-Family Home',
    description: 'A standalone residential home designed for one household.',
  },
  {
    value: 'Townhouse',
    description:
      'A multi-level residential home that shares one or more walls with neighboring homes.',
  },
  {
    value: 'Duplex',
    description: 'A residential building divided into two separate rental units.',
  },
  {
    value: 'Triplex',
    description: 'A residential building divided into three separate rental units.',
  },
  {
    value: 'Fourplex',
    description: 'A residential building divided into four separate rental units.',
  },
  {
    value: 'Multi-Family Building',
    description: 'A residential building containing five or more separate rental units.',
  },
  {
    value: 'Studio Apartment',
    description:
      'A compact apartment where the bedroom, living room, and kitchen area share one primary open space.',
  },
  {
    value: 'Loft',
    description:
      'An open-concept residential unit, often featuring high ceilings and fewer interior walls.',
  },
  {
    value: 'Basement Apartment / Accessory Dwelling Unit',
    description:
      'A secondary residential unit located within, attached to, or on the same property as a primary home.',
  },
  {
    value: 'Vacation Rental',
    description:
      'A furnished residential property primarily intended for short-term or temporary stays.',
  },
]

/** Legacy stored labels → current rental type. */
const LEGACY_RENTAL_TYPE_MAP: Record<string, PropertyHousingType> = {
  'Single-family home': 'Single-Family Home',
  'Multi-family home': 'Multi-Family Building',
  Condominium: 'Condominium (Condo)',
  Studio: 'Studio Apartment',
  Other: 'Single-Family Home',
}

export function normalizeRentalType(value: unknown): PropertyHousingType {
  const trimmed = String(value ?? '').trim()
  if ((PROPERTY_HOUSING_TYPES as string[]).includes(trimmed)) {
    return trimmed as PropertyHousingType
  }
  return LEGACY_RENTAL_TYPE_MAP[trimmed] ?? 'Single-Family Home'
}

/** Rental types that may contain multiple units (show Number of Units field). */
export const MULTI_UNIT_RENTAL_TYPES: readonly PropertyHousingType[] = [
  'Apartment',
  'Duplex',
  'Triplex',
  'Fourplex',
  'Multi-Family Building',
] as const

export function rentalTypeShowsUnitCount(type: PropertyHousingType): boolean {
  return (MULTI_UNIT_RENTAL_TYPES as readonly string[]).includes(type)
}

/** Suggested unit count when a multi-unit rental type is selected. */
export function suggestedUnitCount(type: PropertyHousingType): number {
  switch (type) {
    case 'Duplex':
      return 2
    case 'Triplex':
      return 3
    case 'Fourplex':
      return 4
    case 'Multi-Family Building':
      return 5
    case 'Apartment':
      return 1
    default:
      return 1
  }
}

export function getRentalTypeDescription(type: PropertyHousingType): string {
  return RENTAL_TYPE_OPTIONS.find((option) => option.value === type)?.description ?? ''
}

/**
 * Short unit-type label for arrangement chips and occupancy summaries.
 * Maps housing types to how the unit is divided (house / apartment / duplex, etc.).
 */
export function unitTypeArrangementLabel(
  type: PropertyHousingType | string | null | undefined
): string | null {
  if (type == null || String(type).trim() === '') return null
  const normalized = normalizeRentalType(type)
  switch (normalized) {
    case 'Single-Family Home':
      return 'House'
    case 'Studio Apartment':
      return 'Studio'
    case 'Condominium (Condo)':
      return 'Condo'
    case 'Basement Apartment / Accessory Dwelling Unit':
      return 'ADU'
    case 'Multi-Family Building':
      return 'Multi-family'
    case 'Vacation Rental':
      return 'Vacation rental'
    default:
      return normalized
  }
}
