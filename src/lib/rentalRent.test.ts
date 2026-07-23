import { describe, expect, it } from 'vitest'
import {
  extractUnitLabel,
  generateMonthlyRent,
  resolvePropertyMonthlyRent,
  roundToRealisticRent,
  tenantMonthlyShare,
} from '@/lib/rentalRent'
import type { Property } from '@/types'

function property(partial: Partial<Property> & Pick<Property, 'address' | 'propertyType'>): Property {
  return {
    id: 'p1',
    unitCount: 1,
    bedrooms: 2,
    maxTenants: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('rentalRent', () => {
  it('generates stable rent for the same property inputs', () => {
    const input = property({
      address: '523 Juanita Street, Steubenville, OH 43952',
      propertyType: 'Single-Family Home',
      bedrooms: 3,
      maxTenants: 4,
      addressDetails: { state: 'OH' },
    })
    const a = generateMonthlyRent(input)
    const b = generateMonthlyRent(input)
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(1500)
    expect(a).toBeLessThanOrEqual(4500)
  })

  it('prefers stored monthlyRent and keeps it stable', () => {
    const input = property({
      address: '1430 Ridge Avenue, Unit B, Steubenville, OH 43952',
      propertyType: 'Duplex',
      monthlyRent: 1400,
    })
    expect(resolvePropertyMonthlyRent(input)).toBe(1400)
  })

  it('rounds to realistic listing increments', () => {
    expect(roundToRealisticRent(1237)).toBe(1225)
    expect(roundToRealisticRent(1873)).toBe(1850)
    expect(roundToRealisticRent(2680)).toBe(2700)
  })

  it('splits unit rent by active tenants, not max occupancy', () => {
    expect(
      tenantMonthlyShare({
        unitMonthlyRent: 2400,
        activeTenantCount: 2,
      })
    ).toBe(1200)
    expect(
      tenantMonthlyShare({
        unitMonthlyRent: 2100,
        activeTenantCount: 3,
      })
    ).toBe(700)
    expect(
      tenantMonthlyShare({
        unitMonthlyRent: 2000,
        activeTenantCount: 1,
      })
    ).toBe(2000)
    expect(
      tenantMonthlyShare({
        unitMonthlyRent: 2400,
        activeTenantCount: 0,
      })
    ).toBeNull()
  })

  it('preserves custom rent share amounts', () => {
    expect(
      tenantMonthlyShare({
        unitMonthlyRent: 2400,
        activeTenantCount: 2,
        customShareAmount: 900,
      })
    ).toBe(900)
  })

  it('extracts unit labels from addresses', () => {
    expect(extractUnitLabel('430 Canton Road, Unit 11, Wintersville, OH 43953')).toMatch(
      /Unit 11/i
    )
    expect(extractUnitLabel('1430 Ridge Avenue, Unit B, Steubenville, OH 43952')).toMatch(
      /Unit B/i
    )
    expect(extractUnitLabel('523 Juanita Street, Steubenville, OH 43952')).toBeNull()
  })
})
