import { describe, expect, it } from 'vitest'
import {
  contractMatchesLocationFilter,
  distanceMiles,
  formatGroupCriteriaLines,
  formatGroupCriteriaSummary,
  formatRegionRadiusSummary,
  isValidRegionRadius,
  pointMatchesRegionRadius,
  regionHasCriteria,
} from '@/lib/contractLocationFilters'
import type { ContractRegion } from '@/types'

describe('distanceMiles', () => {
  it('returns ~0 for the same point', () => {
    expect(distanceMiles({ lat: 40.7, lng: -74 }, { lat: 40.7, lng: -74 })).toBeCloseTo(0, 5)
  })

  it('estimates NYC to Philadelphia around 80 miles', () => {
    const miles = distanceMiles(
      { lat: 40.7128, lng: -74.006 },
      { lat: 39.9526, lng: -75.1652 }
    )
    expect(miles).toBeGreaterThan(70)
    expect(miles).toBeLessThan(95)
  })
})

describe('region radius matching', () => {
  const region: ContractRegion = {
    id: 'r1',
    name: 'Downtown',
    areaCodes: [],
    states: [],
    radius: { lat: 40.7128, lng: -74.006, miles: 5, label: 'NYC' },
  }

  it('validates radius shape', () => {
    expect(isValidRegionRadius(region.radius)).toBe(true)
    expect(isValidRegionRadius({ lat: 40, lng: -74, miles: 0 })).toBe(false)
    expect(regionHasCriteria(region)).toBe(true)
  })

  it('matches points inside the circle', () => {
    expect(
      pointMatchesRegionRadius({ lat: 40.72, lng: -74.01 }, region.radius)
    ).toBe(true)
  })

  it('rejects points outside the circle', () => {
    expect(
      pointMatchesRegionRadius({ lat: 40.9, lng: -74.0 }, region.radius)
    ).toBe(false)
  })

  it('filters via contractMatchesLocationFilter with lat/lng', () => {
    expect(
      contractMatchesLocationFilter(
        { areaCode: null, state: null, lat: 40.72, lng: -74.01 },
        { kind: 'region', value: 'r1' },
        [region]
      )
    ).toBe(true)

    expect(
      contractMatchesLocationFilter(
        { areaCode: null, state: null, lat: 41.5, lng: -74.01 },
        { kind: 'region', value: 'r1' },
        [region]
      )
    ).toBe(false)

    expect(
      contractMatchesLocationFilter(
        { areaCode: null, state: null },
        { kind: 'region', value: 'r1' },
        [region]
      )
    ).toBe(false)
  })

  it('still matches area codes / states with OR semantics', () => {
    const mixed: ContractRegion = {
      id: 'r2',
      name: 'Mixed',
      areaCodes: ['212'],
      states: ['NJ'],
      radius: { lat: 40.7128, lng: -74.006, miles: 1 },
    }
    expect(
      contractMatchesLocationFilter(
        { areaCode: '212', state: null, lat: null, lng: null },
        { kind: 'region', value: 'r2' },
        [mixed]
      )
    ).toBe(true)
    expect(
      contractMatchesLocationFilter(
        { areaCode: null, state: 'NJ' },
        { kind: 'region', value: 'r2' },
        [mixed]
      )
    ).toBe(true)
  })

  it('formats radius summary', () => {
    expect(formatRegionRadiusSummary({ lat: 1, lng: 2, miles: 5, label: 'Brooklyn' })).toBe(
      '5-mile radius around Brooklyn'
    )
    expect(formatRegionRadiusSummary({ lat: 1, lng: 2, miles: 2.5 })).toBe('2.5-mile radius')
  })
})

describe('group criteria summaries', () => {
  it('formats compact and bullet summaries with state names', () => {
    const group = {
      areaCodes: ['439'],
      states: ['OH', 'WV'],
      radius: { lat: 40.44, lng: -79.99, miles: 15, label: 'Pittsburgh' },
    }
    expect(formatGroupCriteriaSummary(group)).toBe(
      'Ohio + West Virginia + 439 Area Code + 15-mile radius around Pittsburgh'
    )
    expect(formatGroupCriteriaLines(group)).toEqual([
      'Ohio',
      'West Virginia',
      'Area Code 439',
      '15-mile radius around Pittsburgh',
    ])
  })
})
