import { describe, expect, it } from 'vitest'
import {
  isRentalLocationFilterKind,
  RENTAL_LOCATION_FILTER_OPTIONS,
  RENTAL_TYPE_FILTER_OPTIONS,
  rentalTypeFilterButtonLabel,
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

describe('rentalTypeFilterButtonLabel', () => {
  it('keeps Single-Family Home and common types at full length', () => {
    expect(rentalTypeFilterButtonLabel('Single-Family Home')).toBe(
      'Single-Family Home'
    )
    expect(rentalTypeFilterButtonLabel('Duplex')).toBe('Duplex')
    expect(rentalTypeFilterButtonLabel('Apartment')).toBe('Apartment')
    expect(rentalTypeFilterButtonLabel('Townhouse')).toBe('Townhouse')
  })

  it('shortens only the longest official names for the Filter By button', () => {
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
