import { describe, expect, it } from 'vitest'
import {
  getOccupancyShareDetail,
  getTenantTypeFilterLabel,
  nextTenantTypeFilter,
  resolveArrangementDisplayDetail,
  resolveArrangementDisplayTitle,
  resolveArrangementTenantLabel,
  resolveOfficialTenantOccupancyMode,
  tenantTypeMatchesFilter,
  type OccupancyShareDetail,
} from '@/lib/occupancyStatusFilter'
import type { Client, ContractData, Property } from '@/types'

function client(partial: Partial<Client> & Pick<Client, 'id' | 'name'>): Client {
  return {
    email: `${partial.id}@example.com`,
    phone: '',
    projectType: 'House',
    projectName: partial.projectName ?? '12 Oak St',
    isOfficialClient: true,
    contractStatus: 'Signed',
    paymentStatus: 'Deposit Paid',
    deadlines: [],
    createdAt: '2024-01-01',
    ...partial,
  } as Client
}

function contractFor(clientId: string, address = '12 Oak St'): ContractData {
  return {
    id: `c-${clientId}`,
    clientId,
    clientAddress: address,
    propertyAddress: address,
    status: 'Signed',
  } as ContractData
}

function soleDetail(
  overrides: Partial<OccupancyShareDetail> = {}
): OccupancyShareDetail {
  return {
    headline: 'Renting the entire home',
    peerNames: [],
    sharesRoom: false,
    rentalKindLabel: 'Entire home',
    unitTypeLabel: 'House',
    roomPrivacyLabel: null,
    peopleSharingHouse: 1,
    openBedrooms: 2,
    availableBeds: null,
    totalBeds: null,
    roommatesWelcome: false,
    openToRoommates: false,
    bedroomRoster: null,
    summaryLines: [],
    ...overrides,
  }
}

describe('occupancyStatusFilter', () => {
  it('cycles tenant type filters then returns to Any', () => {
    expect(nextTenantTypeFilter(null)).toBe('Sole Tenant')
    expect(nextTenantTypeFilter('Sole Tenant')).toBe('Co-Tenant')
    expect(nextTenantTypeFilter('Co-Tenant')).toBeNull()
    expect(getTenantTypeFilterLabel(null)).toBe('Any')
    expect(getTenantTypeFilterLabel('Sole Tenant')).toBe('Sole Tenant')
  })

  it('matches Sole Tenant vs Co-Tenant for filtering', () => {
    expect(tenantTypeMatchesFilter('Sole Tenant', null)).toBe(true)
    expect(tenantTypeMatchesFilter('Sole Tenant', 'Sole Tenant')).toBe(true)
    expect(tenantTypeMatchesFilter('Co-Tenant', 'Sole Tenant')).toBe(false)
    expect(tenantTypeMatchesFilter('Co-Tenant', 'Co-Tenant')).toBe(true)
  })

  it('resolves preferred occupancy mode for share detail', () => {
    const mode = resolveOfficialTenantOccupancyMode(
      client({
        id: 'a',
        name: 'Alex',
        preferredOccupancyMode: 'shared_room',
      }),
      undefined,
      []
    )
    expect(mode).toBe('shared_room')
  })

  it('lists shared-room peers when bedroomId matches', () => {
    const alex = client({
      id: 'a',
      name: 'Alex Rivera',
      bedroomId: 'br1',
      preferredOccupancyMode: 'shared_room',
    })
    const jordan = client({
      id: 'b',
      name: 'Jordan Lee',
      bedroomId: 'br1',
      preferredOccupancyMode: 'shared_room',
    })
    const contracts: Record<string, ContractData> = {
      a: contractFor('a'),
      b: contractFor('b'),
    }
    const detail = getOccupancyShareDetail(
      alex,
      [alex, jordan],
      (id) => contracts[id],
      [] as Property[]
    )
    expect(detail.sharesRoom).toBe(true)
    expect(detail.peerNames).toEqual(['Jordan Lee'])
    expect(detail.headline).toBe('Shares room with')
    expect(detail.rentalKindLabel).toBe('Single room')
    expect(detail.roomPrivacyLabel).toBe('Shared room')
    expect(detail.peopleSharingHouse).toBe(2)
    expect(detail.roommatesWelcome).toBe(true)
    expect(detail.summaryLines).toContain('Rental: Single room')
    expect(detail.summaryLines).toContain('2 people sharing this house')
    expect(detail.summaryLines).toContain('Roommates welcome')
    expect(detail.summaryLines).toContain('Shares room with: Jordan Lee')
    expect(resolveArrangementDisplayTitle(detail)).toBe('Co-Tenant')
    expect(resolveArrangementDisplayDetail(detail)).toBe('1 roommate')
  })

  it('summarizes entire-home occupancy with unit type, beds, and roommate policy', () => {
    const alex = client({
      id: 'a',
      name: 'Alex Rivera',
      preferredOccupancyMode: 'entire_home',
      bedId: 'bed1',
      bedroomId: 'br1',
    })
    const contracts: Record<string, ContractData> = {
      a: contractFor('a'),
    }
    const property = {
      id: 'p1',
      address: '12 Oak St',
      propertyType: 'Single-Family Home',
      bedroomsLayout: [
        {
          id: 'br1',
          label: 'Bedroom 1',
          privacy: 'private',
          beds: [{ id: 'bed1', size: 'queen', capacity: 2 }],
        },
        {
          id: 'br2',
          label: 'Bedroom 2',
          privacy: 'private',
          beds: [{ id: 'bed2', size: 'queen', capacity: 2 }],
        },
      ],
    } as Property

    const detail = getOccupancyShareDetail(
      alex,
      [alex],
      (id) => contracts[id],
      [property]
    )
    expect(detail.rentalKindLabel).toBe('Entire home')
    expect(detail.unitTypeLabel).toBe('House')
    expect(detail.roomPrivacyLabel).toBeNull()
    expect(detail.peopleSharingHouse).toBe(1)
    expect(detail.roommatesWelcome).toBe(false)
    expect(detail.openBedrooms).toBe(1)
    expect(detail.availableBeds).toBe(1)
    expect(detail.totalBeds).toBe(2)
    expect(detail.summaryLines).toEqual([
      'Unit type: House',
      'Rental: Entire home',
      '1 person in this house',
      '2 bedrooms · 2 beds',
      '1 — Alex Rivera · 1 bed',
      '2 — Vacant · 1 bed',
      '1 additional bed available',
      'Roommates not welcome',
    ])
    expect(detail.bedroomRoster).toEqual({
      totalBedrooms: 2,
      totalBeds: 2,
      rooms: [
        {
          id: 'br1',
          index: 1,
          label: 'Bedroom 1',
          occupants: [
            { id: 'a', name: 'Alex Rivera', rentPaidOnFirst: true },
          ],
          occupantNames: ['Alex Rivera'],
          vacant: false,
          bedCount: 1,
        },
        {
          id: 'br2',
          index: 2,
          label: 'Bedroom 2',
          occupants: [],
          occupantNames: [],
          vacant: true,
          bedCount: 1,
        },
      ],
    })
    expect(resolveArrangementDisplayTitle(detail)).toBe('Sole Tenant')
    expect(resolveArrangementDisplayDetail(detail)).toBe('Entire Home')
  })

  it('counts open bedrooms and single-room privacy with unit-type title', () => {
    const alex = client({
      id: 'a',
      name: 'Alex Rivera',
      bedroomId: 'br1',
      preferredOccupancyMode: 'private_room',
    })
    const jordan = client({
      id: 'b',
      name: 'Jordan Lee',
      bedroomId: 'br2',
      preferredOccupancyMode: 'private_room',
      paymentStatus: 'Overdue',
    })
    const contracts: Record<string, ContractData> = {
      a: contractFor('a'),
      b: contractFor('b'),
    }
    const property = {
      id: 'p1',
      address: '12 Oak St',
      propertyType: 'Apartment',
      bedroomsLayout: [
        { id: 'br1', label: 'Bedroom 1', privacy: 'private', beds: [] },
        { id: 'br2', label: 'Bedroom 2', privacy: 'private', beds: [] },
        { id: 'br3', label: 'Bedroom 3', privacy: 'private', beds: [] },
      ],
    } as Property

    const detail = getOccupancyShareDetail(
      alex,
      [alex, jordan],
      (id) => contracts[id],
      [property]
    )
    expect(detail.rentalKindLabel).toBe('Single room')
    expect(detail.unitTypeLabel).toBe('Apartment')
    expect(detail.roomPrivacyLabel).toBe('Single room')
    expect(detail.peopleSharingHouse).toBe(2)
    expect(detail.openBedrooms).toBe(1)
    expect(detail.roommatesWelcome).toBe(true)
    expect(detail.summaryLines).toContain('Unit type: Apartment')
    expect(detail.summaryLines).toContain('3 bedrooms')
    expect(detail.summaryLines).toContain('1 — Alex Rivera')
    expect(detail.summaryLines).toContain('2 — Jordan Lee')
    expect(detail.summaryLines).toContain('3 — Vacant')
    expect(detail.summaryLines).not.toContain('Shares property with: Jordan Lee')
    expect(resolveArrangementDisplayTitle(detail)).toBe('Co-Tenant')
    expect(resolveArrangementDisplayDetail(detail)).toBe('1 roommate')
    expect(detail.bedroomRoster?.rooms[0].occupants[0].rentPaidOnFirst).toBe(true)
    expect(detail.bedroomRoster?.rooms[1].occupants[0].rentPaidOnFirst).toBe(false)
  })

  it('distributes unassigned tenants across vacant bedrooms without forced sharing', () => {
    const priya = client({ id: 'p', name: 'Priya Patel', preferredOccupancyMode: 'private_room' })
    const ethan = client({ id: 'e', name: 'Ethan Cole', preferredOccupancyMode: 'private_room' })
    const maya = client({ id: 'm', name: 'Maya Nguyen', preferredOccupancyMode: 'private_room' })
    const contracts: Record<string, ContractData> = {
      p: contractFor('p'),
      e: contractFor('e'),
      m: contractFor('m'),
    }
    const property = {
      id: 'p1',
      address: '12 Oak St',
      propertyType: 'Duplex',
      bedroomsLayout: [
        { id: 'br1', label: 'Bedroom 1', privacy: 'private', beds: [] },
        { id: 'br2', label: 'Bedroom 2', privacy: 'private', beds: [] },
        { id: 'br3', label: 'Bedroom 3', privacy: 'private', beds: [] },
        { id: 'br4', label: 'Bedroom 4', privacy: 'private', beds: [] },
      ],
    } as Property

    const detail = getOccupancyShareDetail(
      priya,
      [priya, ethan, maya],
      (id) => contracts[id],
      [property]
    )
    expect(detail.bedroomRoster?.totalBedrooms).toBe(4)
    expect(detail.summaryLines).toContain('1 — Ethan Cole')
    expect(detail.summaryLines).toContain('2 — Maya Nguyen')
    expect(detail.summaryLines).toContain('3 — Priya Patel')
    expect(detail.summaryLines).toContain('4 — Vacant')
    const occupied = detail.bedroomRoster!.rooms.filter((r) => !r.vacant)
    expect(occupied).toHaveLength(3)
    expect(occupied.every((r) => r.occupantNames.length === 1)).toBe(true)
    expect(resolveArrangementDisplayTitle(detail)).toBe('Co-Tenant')
    expect(resolveArrangementDisplayDetail(detail)).toBe('2 roommates')
  })

  it('keeps explicitly shared bedroom assignments together', () => {
    const alex = client({
      id: 'a',
      name: 'Alex Rivera',
      bedroomId: 'br1',
      preferredOccupancyMode: 'shared_room',
    })
    const jordan = client({
      id: 'b',
      name: 'Jordan Lee',
      bedroomId: 'br1',
      preferredOccupancyMode: 'shared_room',
    })
    const contracts: Record<string, ContractData> = {
      a: contractFor('a'),
      b: contractFor('b'),
    }
    const property = {
      id: 'p1',
      address: '12 Oak St',
      propertyType: 'Single-Family Home',
      bedroomsLayout: [
        { id: 'br1', label: 'Bedroom 1', privacy: 'shared', beds: [] },
        { id: 'br2', label: 'Bedroom 2', privacy: 'private', beds: [] },
      ],
    } as Property

    const detail = getOccupancyShareDetail(
      alex,
      [alex, jordan],
      (id) => contracts[id],
      [property]
    )
    expect(detail.summaryLines).toContain('1 — Alex Rivera, Jordan Lee')
    expect(detail.summaryLines).toContain('2 — Vacant')
    expect(resolveArrangementDisplayTitle(detail)).toBe('Co-Tenant')
    expect(resolveArrangementDisplayDetail(detail)).toBe('1 roommate')
  })

  it('labels Sole Tenant vs Co-Tenant from share detail', () => {
    const sole = soleDetail()
    expect(resolveArrangementTenantLabel(sole)).toBe('Sole Tenant')
    expect(resolveArrangementDisplayTitle(sole)).toBe('Sole Tenant')
    expect(resolveArrangementDisplayDetail(sole)).toBe('Entire Home')

    // Alone but open to roommates is still Sole — preference is shown separately.
    expect(
      resolveArrangementTenantLabel({
        ...sole,
        roommatesWelcome: true,
        openToRoommates: true,
      })
    ).toBe('Sole Tenant')

    expect(
      resolveArrangementTenantLabel({
        ...sole,
        peopleSharingHouse: 2,
        peerNames: ['Jordan Lee'],
      })
    ).toBe('Co-Tenant')

    expect(
      resolveArrangementDisplayTitle({
        ...sole,
        rentalKindLabel: 'Single room',
        roomPrivacyLabel: 'Shared room',
        roommatesWelcome: true,
        openToRoommates: true,
        unitTypeLabel: 'Apartment',
      })
    ).toBe('Co-Tenant')
    expect(
      resolveArrangementDisplayDetail({
        ...sole,
        rentalKindLabel: 'Single room',
        roomPrivacyLabel: 'Shared room',
        peopleSharingHouse: 2,
        peerNames: ['Jordan Lee'],
        roommatesWelcome: true,
        openToRoommates: true,
        unitTypeLabel: 'Apartment',
      })
    ).toBe('1 roommate')

    expect(
      resolveArrangementDisplayTitle({
        ...sole,
        rentalKindLabel: 'Single room',
        roomPrivacyLabel: 'Single room',
        peopleSharingHouse: 2,
        peerNames: ['Jordan Lee'],
        unitTypeLabel: 'House',
      })
    ).toBe('Co-Tenant')
    expect(
      resolveArrangementDisplayDetail({
        ...sole,
        rentalKindLabel: 'Single room',
        roomPrivacyLabel: 'Single room',
        peopleSharingHouse: 2,
        peerNames: ['Jordan Lee'],
        unitTypeLabel: 'House',
      })
    ).toBe('1 roommate')
  })
})
