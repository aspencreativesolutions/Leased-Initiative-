import { describe, expect, it } from 'vitest'
import {
  formatPropertyListingDescription,
  furnishedStatusLabel,
  utilitiesIncludedLabel,
} from '@/lib/propertyListingDisplay'

describe('formatPropertyListingDescription', () => {
  it('includes furnished status, total rent, full occupancy cost, and utilities', () => {
    expect(
      formatPropertyListingDescription({
        furnished: true,
        monthlyRent: 2400,
        costPerPersonAtMax: 600,
        utilitiesIncluded: true,
      })
    ).toBe('Furnished · $2,400 total · $600/person at full occupancy · Utilities included')
  })

  it('notes when utilities are not included for unfurnished rentals', () => {
    expect(
      formatPropertyListingDescription({
        furnished: false,
        monthlyRent: 2150,
        costPerPersonAtMax: 538,
        utilitiesIncluded: false,
      })
    ).toBe('Unfurnished · $2,150 total · $538/person at full occupancy · Utilities not included')
  })
})

describe('furnishedStatusLabel', () => {
  it('labels furnished vs unfurnished for Rentals tags', () => {
    expect(furnishedStatusLabel(true)).toBe('Furnished')
    expect(furnishedStatusLabel(false)).toBe('Unfurnished')
    expect(furnishedStatusLabel(undefined)).toBe('Unfurnished')
  })
})

describe('utilitiesIncludedLabel', () => {
  it('labels included vs not included', () => {
    expect(utilitiesIncludedLabel(true)).toBe('Utilities included')
    expect(utilitiesIncludedLabel(false)).toBe('Utilities not included')
    expect(utilitiesIncludedLabel(undefined)).toBe('Utilities not included')
  })
})
