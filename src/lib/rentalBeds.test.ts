import { describe, expect, it } from 'vitest'
import {
  bedCapacityForSize,
  buildRentalBedOccupancy,
  defaultBedroomsLayout,
  ensurePropertyBedLayout,
  findLayoutAssignmentConflicts,
  maxOccupancyFromLayout,
  resolveBedMonthlyRent,
  tenantShareForAssignedBed,
  totalBedCount,
} from '@/lib/rentalBeds'
import type { Client, Property, PropertyBedroom } from '@/types'

function prop(overrides: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    address: '100 Test St',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 2,
    maxTenants: 4,
    monthlyRent: 1600,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    name: 'Test Tenant',
    email: 't@example.com',
    phone: '',
    projectName: '100 Test St',
    projectType: 'Apartment',
    projectStatus: 'In Progress',
    contractStatus: 'Signed',
    paymentStatus: 'Paid',
    notes: [],
    deadlines: [],
    isOfficialClient: true,
    ...overrides,
  } as Client
}

describe('rentalBeds', () => {
  it('maps bed sizes to sleeping capacity', () => {
    expect(bedCapacityForSize('twin')).toBe(1)
    expect(bedCapacityForSize('full')).toBe(2)
    expect(bedCapacityForSize('queen')).toBe(2)
    expect(bedCapacityForSize('king')).toBe(2)
  })

  it('defaults one Queen per bedroom for migration', () => {
    const layout = defaultBedroomsLayout(2)
    expect(layout).toHaveLength(2)
    expect(layout[0].beds).toHaveLength(1)
    expect(layout[0].beds[0].size).toBe('queen')
    expect(maxOccupancyFromLayout(layout)).toBe(4)
    expect(totalBedCount({ bedroomsLayout: layout })).toBe(2)
  })

  it('ensurePropertyBedLayout backfills missing layout and syncs maxTenants', () => {
    const next = ensurePropertyBedLayout(prop({ bedrooms: 3, maxTenants: 99 }))
    expect(next.bedroomsLayout).toHaveLength(3)
    expect(next.maxTenants).toBe(6)
    expect(next.bedrooms).toBe(3)
  })

  it('counts a queen with one tenant as one occupied bed', () => {
    const layout: PropertyBedroom[] = [
      {
        id: 'br1',
        label: 'Bedroom 1',
        beds: [{ id: 'bed1', label: 'Bed 1', size: 'queen', capacity: 2 }],
      },
      {
        id: 'br2',
        label: 'Bedroom 2',
        beds: [
          { id: 'bed2', label: 'Bed 1', size: 'twin', capacity: 1 },
          { id: 'bed3', label: 'Bed 2', size: 'twin', capacity: 1 },
        ],
      },
    ]
    const property = prop({ bedroomsLayout: layout, bedrooms: 2, maxTenants: 4 })
    const tenants = [
      client({
        id: 'c1',
        name: 'Olivia',
        bedroomId: 'br1',
        bedId: 'bed1',
      }),
    ]
    const occ = buildRentalBedOccupancy(property, tenants)
    expect(occ.totalBeds).toBe(3)
    expect(occ.occupiedBeds).toBe(1)
    expect(occ.availableBeds).toBe(2)
    expect(occ.currentOccupants).toBe(1)
    expect(occ.maxOccupancy).toBe(4)
  })

  it('counts two tenants on one queen as two occupants and one occupied bed', () => {
    const layout: PropertyBedroom[] = [
      {
        id: 'br1',
        label: 'Bedroom 1',
        beds: [{ id: 'bed1', size: 'queen', capacity: 2 }],
      },
    ]
    const property = prop({ bedroomsLayout: layout, bedrooms: 1, maxTenants: 2, monthlyRent: 800 })
    const tenants = [
      client({ id: 'c1', name: 'Olivia', bedroomId: 'br1', bedId: 'bed1' }),
      client({ id: 'c2', name: 'Daniel', bedroomId: 'br1', bedId: 'bed1' }),
    ]
    const occ = buildRentalBedOccupancy(property, tenants)
    expect(occ.occupiedBeds).toBe(1)
    expect(occ.currentOccupants).toBe(2)

    const share = tenantShareForAssignedBed(property, tenants[0], tenants)
    expect(share).toBe(400)
  })

  it('resolves equal bed rent without changing total when sizes differ', () => {
    const layout: PropertyBedroom[] = [
      {
        id: 'br1',
        label: 'Bedroom 1',
        beds: [
          { id: 'bed1', size: 'queen', capacity: 2 },
          { id: 'bed2', size: 'twin', capacity: 1 },
        ],
      },
    ]
    const property = prop({ bedroomsLayout: layout, monthlyRent: 1000 })
    expect(resolveBedMonthlyRent(property, layout[0].beds[0])).toBe(500)
    expect(resolveBedMonthlyRent(property, layout[0].beds[1])).toBe(500)
  })

  it('flags removed beds that still have tenants', () => {
    const previous = prop({
      bedroomsLayout: [
        {
          id: 'br1',
          label: 'Bedroom 1',
          beds: [{ id: 'bed1', size: 'queen', capacity: 2 }],
        },
      ],
    })
    const nextLayout: PropertyBedroom[] = [
      {
        id: 'br1',
        label: 'Bedroom 1',
        beds: [{ id: 'bed2', size: 'twin', capacity: 1 }],
      },
    ]
    const tenants = [client({ bedId: 'bed1', bedroomId: 'br1', name: 'Olivia' })]
    const conflicts = findLayoutAssignmentConflicts(previous, nextLayout, tenants)
    expect(conflicts.some((c) => c.reason === 'removed')).toBe(true)
  })
})
