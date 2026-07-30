import { describe, expect, it } from 'vitest'
import { readStoredPropertyCoordinates } from '@/lib/geocodeAddress'

describe('readStoredPropertyCoordinates', () => {
  it('returns finite lat/lng from address details', () => {
    expect(
      readStoredPropertyCoordinates({
        addressDetails: { lat: 40.3712, lng: -80.6358 },
      })
    ).toEqual({ lat: 40.3712, lng: -80.6358 })
  })

  it('coerces numeric strings from JSON stores', () => {
    expect(
      readStoredPropertyCoordinates({
        addressDetails: { lat: '40.3712', lng: '-80.6358' },
      })
    ).toEqual({ lat: 40.3712, lng: -80.6358 })
  })

  it('returns null when coordinates are missing or invalid', () => {
    expect(readStoredPropertyCoordinates({})).toBeNull()
    expect(
      readStoredPropertyCoordinates({ addressDetails: { lat: 40, lng: undefined } })
    ).toBeNull()
    expect(
      readStoredPropertyCoordinates({
        addressDetails: { lat: Number.NaN, lng: -80 },
      })
    ).toBeNull()
  })
})
