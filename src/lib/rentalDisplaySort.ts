import type { ContractLocationFilterKind } from '@/lib/contractLocationFilters'
import { PROPERTY_HOUSING_TYPES, type PropertyHousingType } from '@/types'

/** Location filters available under Rentals Display Settings → Filter By. */
export type RentalLocationFilterKind = Exclude<ContractLocationFilterKind, 'areaCode'>

export type RentalFilterByOptionId = RentalLocationFilterKind

export const RENTAL_LOCATION_FILTER_OPTIONS: {
  id: RentalLocationFilterKind
  label: string
}[] = [
  { id: 'state', label: 'State' },
  { id: 'region', label: 'Group' },
]

/** All rental types supported by the app — Filter By options. */
export const RENTAL_TYPE_FILTER_OPTIONS: readonly PropertyHousingType[] =
  PROPERTY_HOUSING_TYPES

/**
 * Compact label for very long official names on the Filter By button.
 * Keeps Single-Family Home and other common types at full length.
 */
export function rentalTypeFilterButtonLabel(type: PropertyHousingType): string {
  if (type === 'Basement Apartment / Accessory Dwelling Unit') return 'Basement / ADU'
  if (type === 'Condominium (Condo)') return 'Condo'
  if (type === 'Multi-Family Building') return 'Multi-Family'
  if (type === 'Studio Apartment') return 'Studio'
  return type
}

/**
 * Fixed Filter By control width — sized for the longest button label
 * (Single-Family Home / Filter By) so the control does not resize between selections.
 */
export const RENTAL_FILTER_BY_BUTTON_WIDTH_CLASS = 'w-[12.75rem]'

export function isRentalLocationFilterKind(
  id: string
): id is RentalLocationFilterKind {
  return id === 'state' || id === 'region'
}
