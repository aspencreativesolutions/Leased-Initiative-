import type { ContractLocationFilterKind } from '@/lib/contractLocationFilters'
import { PROPERTY_HOUSING_TYPES, type PropertyHousingType } from '@/types'

/** Location filters available under Rentals Display Settings → Filter. */
export type RentalLocationFilterKind = Exclude<ContractLocationFilterKind, 'areaCode'>

export type RentalFilterByOptionId = RentalLocationFilterKind

export const RENTAL_LOCATION_FILTER_OPTIONS: {
  id: RentalLocationFilterKind
  label: string
}[] = [
  { id: 'state', label: 'State' },
  { id: 'region', label: 'Group' },
]

/**
 * Click-to-cycle when option count is at or below these thresholds;
 * otherwise use a dropdown.
 */
export const RENTAL_STATE_FILTER_CYCLE_MAX = 3
export const RENTAL_TOWN_FILTER_CYCLE_MAX = 5
export const RENTAL_GROUP_FILTER_CYCLE_MAX = 5

export const RENTAL_STATE_FILTER_ANY_LABEL = 'State'
export const RENTAL_TOWN_FILTER_ANY_LABEL = 'Town'
export const RENTAL_GROUP_FILTER_ANY_LABEL = 'All Groups'

/**
 * Fixed widths so Display Settings controls do not resize between selections.
 * State and Town share one width (sized for the default State / Town labels)
 * so the pair stays visually matched; longer selected values truncate.
 */
export const RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS = 'w-[8rem]'
export const RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS = 'w-[8.5rem]'

/** All rental types supported by the app (e.g. spreadsheet type select). */
export const RENTAL_TYPE_FILTER_OPTIONS: readonly PropertyHousingType[] =
  PROPERTY_HOUSING_TYPES

/**
 * Rental Type cycle in Display Settings (after All Rentals).
 * Order: Apartment → Single-Family Home → Townhouse → Duplex.
 */
export const RENTAL_TYPE_DISPLAY_FILTERS = [
  'Apartment',
  'Single-Family Home',
  'Townhouse',
  'Duplex',
] as const satisfies ReadonlyArray<PropertyHousingType>

export type RentalTypeDisplayFilter =
  (typeof RENTAL_TYPE_DISPLAY_FILTERS)[number]

/** Full cycle including All Rentals (null) for the Display Settings type button. */
export const RENTAL_TYPE_FILTER_CYCLE = [
  null,
  ...RENTAL_TYPE_DISPLAY_FILTERS,
] as const satisfies ReadonlyArray<RentalTypeDisplayFilter | null>

/**
 * Compact label for very long official names on the Filter control
 * when a type outside the cycle is selected (e.g. spreadsheet select).
 */
export function rentalTypeFilterButtonLabel(type: PropertyHousingType): string {
  if (type === 'Basement Apartment / Accessory Dwelling Unit') return 'Basement / ADU'
  if (type === 'Condominium (Condo)') return 'Condo'
  if (type === 'Multi-Family Building') return 'Multi-Family'
  if (type === 'Studio Apartment') return 'Studio'
  return type
}

/** Button label for the Rental Type cycle control (`null` → All Rentals). */
export function getRentalTypeFilterLabel(
  filter: RentalTypeDisplayFilter | PropertyHousingType | null | ''
): string {
  if (!filter) return 'All Rentals'
  return rentalTypeFilterButtonLabel(filter)
}

export function isRentalTypeDisplayFilter(
  value: string | null | undefined
): value is RentalTypeDisplayFilter {
  return (
    value != null &&
    (RENTAL_TYPE_DISPLAY_FILTERS as readonly string[]).includes(value)
  )
}

/**
 * Advance All Rentals → Apartment → Single-Family Home → Townhouse → Duplex → All Rentals.
 * Values outside the cycle (e.g. Condo from the spreadsheet select) reset to All Rentals.
 */
export function nextRentalTypeFilter(
  current: PropertyHousingType | null | ''
): RentalTypeDisplayFilter | null {
  const cycle = RENTAL_TYPE_FILTER_CYCLE
  const normalized =
    current === '' || current == null ? null : current
  const idx = cycle.findIndex((s) => s === normalized)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % cycle.length
  return cycle[nextIdx] ?? null
}

/**
 * Fixed Rental Type cycle control width — sized for Single-Family Home
 * so the control does not resize between selections.
 */
export const RENTAL_TYPE_FILTER_BUTTON_WIDTH_CLASS = 'w-[12.75rem]'

export function isRentalLocationFilterKind(
  id: string
): id is RentalLocationFilterKind {
  return id === 'state' || id === 'region'
}

/** Whether a location value list should cycle on click vs open a dropdown. */
export function shouldCycleLocationFilter(
  optionCount: number,
  cycleMax: number
): boolean {
  return optionCount > 0 && optionCount <= cycleMax
}

/**
 * Advance Any → option1 → … → optionN → Any.
 * Empty string means the "any" sentinel. Unknown current values reset to Any.
 */
export function nextOptionalLocationFilter(
  current: string | null | undefined,
  options: readonly string[]
): string {
  const cycle = ['', ...options]
  const normalized = current?.trim() ? current : ''
  const idx = cycle.findIndex((entry) => entry === normalized)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % cycle.length
  return cycle[nextIdx] ?? ''
}

/** Case-insensitive match for town/city filter values. */
export function townsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = a?.trim().toLowerCase()
  const right = b?.trim().toLowerCase()
  if (!left || !right) return false
  return left === right
}

export function getRentalStateFilterLabel(state: string | null | undefined): string {
  const trimmed = state?.trim()
  return trimmed ? trimmed.toUpperCase() : RENTAL_STATE_FILTER_ANY_LABEL
}

export function getRentalTownFilterLabel(town: string | null | undefined): string {
  const trimmed = town?.trim()
  return trimmed || RENTAL_TOWN_FILTER_ANY_LABEL
}

export function getRentalGroupFilterLabel(
  groupId: string | null | undefined,
  groups: ReadonlyArray<{ id: string; name: string }>
): string {
  const id = groupId?.trim()
  if (!id) return RENTAL_GROUP_FILTER_ANY_LABEL
  const match = groups.find((group) => group.id === id)
  return match?.name.trim() || RENTAL_GROUP_FILTER_ANY_LABEL
}
