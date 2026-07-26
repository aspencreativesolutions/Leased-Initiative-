import { describe, expect, it } from 'vitest'
import {
  rentalOccupancyRatio,
  rentalOccupancyStatusLabel,
  rentalOccupancyTone,
} from '@/lib/properties'

describe('rentalOccupancyTone', () => {
  it('maps full vacancy to dark-red vacant and zero open units to green full', () => {
    expect(rentalOccupancyTone(4, 4)).toBe('vacant')
    expect(rentalOccupancyTone(1, 1)).toBe('vacant')
    expect(rentalOccupancyTone(0, 4)).toBe('full')
    expect(rentalOccupancyTone(0, 1)).toBe('full')
  })

  it('shifts from dark red toward green as occupancy rises', () => {
    expect(rentalOccupancyTone(3, 4)).toBe('low')
    expect(rentalOccupancyTone(2, 4)).toBe('mid')
    expect(rentalOccupancyTone(1, 4)).toBe('high')
    expect(rentalOccupancyRatio(1, 4)).toBe(0.75)
  })

  it('labels fully occupied without a numeric open-bed cue', () => {
    expect(rentalOccupancyStatusLabel(0, 3)).toBe('Fully occupied')
    expect(rentalOccupancyStatusLabel(2, 4)).toBe('2 of 4 open beds')
  })

  it('labels whole-unit vacancy without open-bed wording', () => {
    expect(
      rentalOccupancyStatusLabel(1, 1, { surfacesBeds: false })
    ).toBe('Entire home available')
    expect(
      rentalOccupancyStatusLabel(0, 1, { surfacesBeds: false })
    ).toBe('Fully occupied')
  })
})
