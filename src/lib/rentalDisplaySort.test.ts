import { describe, expect, it } from 'vitest'
import {
  getRentalGroupFilterLabel,
  getRentalStateFilterLabel,
  getRentalTownFilterLabel,
  getRentalTypeFilterLabel,
  isRentalLocationFilterKind,
  isRentalTypeDisplayFilter,
  nextOptionalLocationFilter,
  nextRentalTypeFilter,
  RENTAL_GROUP_FILTER_ANY_LABEL,
  RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS,
  RENTAL_GROUP_FILTER_CYCLE_MAX,
  RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS,
  RENTAL_LOCATION_FILTER_OPTIONS,
  RENTAL_STATE_FILTER_ANY_LABEL,
  RENTAL_STATE_FILTER_CYCLE_MAX,
  RENTAL_TOWN_FILTER_ANY_LABEL,
  RENTAL_TOWN_FILTER_CYCLE_MAX,
  RENTAL_TYPE_DISPLAY_FILTERS,
  RENTAL_TYPE_FILTER_CYCLE,
  RENTAL_TYPE_FILTER_OPTIONS,
  rentalTypeFilterButtonLabel,
  shouldCycleLocationFilter,
  townsMatch,
} from '@/lib/rentalDisplaySort'

describe('RENTAL_TYPE_FILTER_OPTIONS', () => {
  it('includes Duplex, Apartment, Single-Family Home, Townhouse, and other supported types', () => {
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Duplex')
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Apartment')
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Single-Family Home')
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Townhouse')
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Condominium (Condo)')
    expect(RENTAL_TYPE_FILTER_OPTIONS).toContain('Studio Apartment')
    expect(RENTAL_TYPE_FILTER_OPTIONS.length).toBeGreaterThanOrEqual(4)
  })
})

describe('RENTAL_TYPE_DISPLAY_FILTERS', () => {
  it('cycles Apartment → Single-Family Home → Townhouse → Duplex after Any', () => {
    expect(RENTAL_TYPE_DISPLAY_FILTERS).toEqual([
      'Apartment',
      'Single-Family Home',
      'Townhouse',
      'Duplex',
    ])
    expect(RENTAL_TYPE_FILTER_CYCLE).toEqual([
      null,
      'Apartment',
      'Single-Family Home',
      'Townhouse',
      'Duplex',
    ])
  })
})

describe('RENTAL_LOCATION_FILTER_OPTIONS', () => {
  it('lists state and group location filters', () => {
    expect(RENTAL_LOCATION_FILTER_OPTIONS.map((o) => o.id)).toEqual([
      'state',
      'region',
    ])
    expect(RENTAL_LOCATION_FILTER_OPTIONS.map((o) => o.label)).toEqual([
      'State',
      'Group',
    ])
  })

  it('classifies location filter options', () => {
    expect(isRentalLocationFilterKind('region')).toBe(true)
    expect(isRentalLocationFilterKind('state')).toBe(true)
    expect(isRentalLocationFilterKind('openUnits')).toBe(false)
    expect(isRentalLocationFilterKind('propertyType')).toBe(false)
  })
})

describe('location filter cycle vs dropdown thresholds', () => {
  it('cycles state when three or fewer options', () => {
    expect(RENTAL_STATE_FILTER_CYCLE_MAX).toBe(3)
    expect(shouldCycleLocationFilter(0, RENTAL_STATE_FILTER_CYCLE_MAX)).toBe(false)
    expect(shouldCycleLocationFilter(3, RENTAL_STATE_FILTER_CYCLE_MAX)).toBe(true)
    expect(shouldCycleLocationFilter(4, RENTAL_STATE_FILTER_CYCLE_MAX)).toBe(false)
  })

  it('cycles town and group when five or fewer options', () => {
    expect(RENTAL_TOWN_FILTER_CYCLE_MAX).toBe(5)
    expect(RENTAL_GROUP_FILTER_CYCLE_MAX).toBe(5)
    expect(shouldCycleLocationFilter(5, RENTAL_TOWN_FILTER_CYCLE_MAX)).toBe(true)
    expect(shouldCycleLocationFilter(6, RENTAL_TOWN_FILTER_CYCLE_MAX)).toBe(false)
  })
})

describe('nextOptionalLocationFilter', () => {
  it('advances Any → options → Any', () => {
    expect(nextOptionalLocationFilter('', ['OH', 'PA', 'WV'])).toBe('OH')
    expect(nextOptionalLocationFilter('OH', ['OH', 'PA', 'WV'])).toBe('PA')
    expect(nextOptionalLocationFilter('PA', ['OH', 'PA', 'WV'])).toBe('WV')
    expect(nextOptionalLocationFilter('WV', ['OH', 'PA', 'WV'])).toBe('')
  })

  it('resets unknown values to Any', () => {
    expect(nextOptionalLocationFilter('NY', ['OH', 'PA'])).toBe('')
  })
})

describe('location filter labels', () => {
  it('maps empty values to Any defaults', () => {
    expect(RENTAL_STATE_FILTER_ANY_LABEL).toBe('Any')
    expect(RENTAL_TOWN_FILTER_ANY_LABEL).toBe('Any')
    expect(getRentalStateFilterLabel('')).toBe(RENTAL_STATE_FILTER_ANY_LABEL)
    expect(getRentalTownFilterLabel('')).toBe(RENTAL_TOWN_FILTER_ANY_LABEL)
    expect(getRentalGroupFilterLabel('', [])).toBe(RENTAL_GROUP_FILTER_ANY_LABEL)
  })

  it('keeps State and Town on one fixed width so the pair does not resize', () => {
    expect(RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS).toBe('w-[8rem]')
    expect(RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS).toBe('w-[8.5rem]')
  })

  it('uppercases state abbreviations and resolves group names', () => {
    expect(getRentalStateFilterLabel('oh')).toBe('OH')
    expect(getRentalTownFilterLabel('Steubenville')).toBe('Steubenville')
    expect(
      getRentalGroupFilterLabel('g1', [{ id: 'g1', name: 'Tri-State' }])
    ).toBe('Tri-State')
  })

  it('matches towns case-insensitively', () => {
    expect(townsMatch('Steubenville', 'steubenville')).toBe(true)
    expect(townsMatch('Steubenville', 'Pittsburgh')).toBe(false)
    expect(townsMatch('', 'Steubenville')).toBe(false)
  })
})

describe('rentalTypeFilterButtonLabel', () => {
  it('keeps Single-Family Home and common types at full length', () => {
    expect(rentalTypeFilterButtonLabel('Single-Family Home')).toBe(
      'Single-Family Home'
    )
    expect(rentalTypeFilterButtonLabel('Duplex')).toBe('Duplex')
    expect(rentalTypeFilterButtonLabel('Apartment')).toBe('Apartment')
    expect(rentalTypeFilterButtonLabel('Townhouse')).toBe('Townhouse')
  })

  it('shortens only the longest official names for the Filter button', () => {
    expect(
      rentalTypeFilterButtonLabel('Basement Apartment / Accessory Dwelling Unit')
    ).toBe('Basement / ADU')
    expect(rentalTypeFilterButtonLabel('Condominium (Condo)')).toBe('Condo')
    expect(rentalTypeFilterButtonLabel('Multi-Family Building')).toBe(
      'Multi-Family'
    )
    expect(rentalTypeFilterButtonLabel('Studio Apartment')).toBe('Studio')
  })
})

describe('getRentalTypeFilterLabel', () => {
  it('maps null / empty to Any', () => {
    expect(getRentalTypeFilterLabel(null)).toBe('Any')
    expect(getRentalTypeFilterLabel('')).toBe('Any')
  })

  it('keeps cycle labels at full length', () => {
    expect(getRentalTypeFilterLabel('Apartment')).toBe('Apartment')
    expect(getRentalTypeFilterLabel('Single-Family Home')).toBe(
      'Single-Family Home'
    )
  })
})

describe('nextRentalTypeFilter', () => {
  it('advances Any → Apartment → Single-Family Home → Townhouse → Duplex → Any', () => {
    expect(nextRentalTypeFilter(null)).toBe('Apartment')
    expect(nextRentalTypeFilter('')).toBe('Apartment')
    expect(nextRentalTypeFilter('Apartment')).toBe('Single-Family Home')
    expect(nextRentalTypeFilter('Single-Family Home')).toBe('Townhouse')
    expect(nextRentalTypeFilter('Townhouse')).toBe('Duplex')
    expect(nextRentalTypeFilter('Duplex')).toBe(null)
  })

  it('resets values outside the cycle to Any', () => {
    expect(nextRentalTypeFilter('Condominium (Condo)')).toBe(null)
    expect(isRentalTypeDisplayFilter('Apartment')).toBe(true)
    expect(isRentalTypeDisplayFilter('Condominium (Condo)')).toBe(false)
  })
})
