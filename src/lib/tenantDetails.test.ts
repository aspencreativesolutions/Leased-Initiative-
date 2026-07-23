import { describe, expect, it } from 'vitest'
import {
  buildTenantDetailsProfile,
  formatPropertyOccupancyStatement,
  getRoommateClients,
  getTenantInitials,
  resolveOccupancyArrangement,
} from '@/lib/tenantDetails'
import type { Client, ContractData, Property } from '@/types'

function makeClient(partial: Partial<Client> & Pick<Client, 'id' | 'name' | 'email'>): Client {
  return {
    businessName: '',
    phone: '',
    projectType: 'House',
    projectName: '523 Juanita Street, Steubenville, OH 43952',
    projectStatus: 'In Progress',
    contractStatus: 'Signed',
    paymentStatus: 'Paid',
    isOfficialClient: true,
    notes: [],
    deadlines: [],
    createdAt: '2025-11-01T00:00:00.000Z',
    leaseLengthMonths: 12,
    demoLeaseStartDate: '2026-01-01',
    ...partial,
  }
}

const property: Property = {
  id: 'prop-1',
  address: '523 Juanita Street, Steubenville, OH 43952',
  propertyType: 'Single-Family Home',
  unitCount: 1,
  bedrooms: 3,
  maxTenants: 4,
  monthlyRent: 2400,
  createdAt: '2025-01-01T00:00:00.000Z',
}

describe('tenantDetails', () => {
  it('returns initials from a full name', () => {
    expect(getTenantInitials('James Chen')).toBe('JC')
    expect(getTenantInitials('Ava')).toBe('AV')
  })

  it('formats occupancy statements from official tenant counts', () => {
    expect(formatPropertyOccupancyStatement(1)).toBe('Only tenant on this property')
    expect(formatPropertyOccupancyStatement(2)).toBe('1 of 2 tenants on this property')
    expect(formatPropertyOccupancyStatement(3)).toBe('1 of 3 tenants on this property')
    expect(formatPropertyOccupancyStatement(4)).toBe('1 of 4 tenants on this property')
  })

  it('derives roommates bidirectionally from the same address', () => {
    const james = makeClient({
      id: 'james',
      name: 'James Chen',
      email: 'james@chenarch.com',
      leaseGroupId: 'lease-juanita-523',
    })
    const jordan = makeClient({
      id: 'jordan',
      name: 'Jordan Kim',
      email: 'jordan.kim@example.com',
      leaseGroupId: 'lease-juanita-523',
    })
    const lisa = makeClient({
      id: 'lisa',
      name: 'Lisa Park',
      email: 'lisa@parkphoto.com',
      projectName: '285 Bethany Pike, Wellsburg, WV 26070',
    })
    const getContract = () => undefined

    const jamesRoommates = getRoommateClients(james, [james, jordan, lisa], getContract)
    const jordanRoommates = getRoommateClients(jordan, [james, jordan, lisa], getContract)

    expect(jamesRoommates.map((c) => c.id)).toEqual(['jordan'])
    expect(jordanRoommates.map((c) => c.id)).toEqual(['james'])
  })

  it('marks solo tenants as living alone with entire-home occupancy', () => {
    const lisa = makeClient({
      id: 'lisa',
      name: 'Lisa Park',
      email: 'lisa@parkphoto.com',
      projectName: '285 Bethany Pike, Wellsburg, WV 26070',
      occupancyArrangement: 'entire_home',
    })
    const properties: Property[] = [
      {
        ...property,
        id: 'bethany',
        address: '285 Bethany Pike, Wellsburg, WV 26070',
        monthlyRent: 1850,
      },
    ]
    const profile = buildTenantDetailsProfile(
      'lisa',
      [lisa],
      properties,
      () => undefined
    )
    expect(profile?.livesAlone).toBe(true)
    expect(profile?.officialTenantsOnProperty).toBe(1)
    expect(profile?.propertyOccupancyStatement).toBe('Only tenant on this property')
    expect(profile?.occupancyArrangementLabel).toBe('Entire home')
    expect(profile?.latePayments).toEqual([])
  })

  it('states shared occupancy as 1 of N official tenants on the property', () => {
    const james = makeClient({
      id: 'james',
      name: 'James Chen',
      email: 'james@chenarch.com',
      leaseGroupId: 'lease-juanita-523',
    })
    const jordan = makeClient({
      id: 'jordan',
      name: 'Jordan Kim',
      email: 'jordan.kim@example.com',
      leaseGroupId: 'lease-juanita-523',
    })
    const prospective = makeClient({
      id: 'prospective',
      name: 'Pat Prospective',
      email: 'pat@example.com',
      isOfficialClient: false,
      contractStatus: 'Sent',
    })
    const former = makeClient({
      id: 'former',
      name: 'Fran Former',
      email: 'fran@example.com',
      demoLeaseStartDate: '2024-01-01',
      leaseLengthMonths: 12,
    })
    const profile = buildTenantDetailsProfile(
      'james',
      [james, jordan, prospective, former],
      [property],
      () => undefined
    )
    expect(profile?.officialTenantsOnProperty).toBe(2)
    expect(profile?.propertyOccupancyStatement).toBe('1 of 2 tenants on this property')
    expect(profile?.roommates.map((r) => r.id)).toEqual(['jordan'])
  })

  it('flags shared vs separate leases for roommates', () => {
    const chris = makeClient({
      id: 'chris',
      name: 'Chris Nguyen',
      email: 'chris.nguyen@example.com',
      projectName: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
      occupancyArrangement: 'room_rental',
      leaseGroupId: 'lease-scioto-chris',
      unitOrRoomLabel: 'Room A',
    })
    const sam = makeClient({
      id: 'sam',
      name: 'Sam Rivera',
      email: 'sam.rivera@example.com',
      projectName: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
      occupancyArrangement: 'room_rental',
      leaseGroupId: 'lease-scioto-sam',
      unitOrRoomLabel: 'Room B',
    })
    const properties: Property[] = [
      {
        ...property,
        id: 'scioto',
        address: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
        propertyType: 'Townhouse',
        monthlyRent: 1750,
      },
    ]
    const contracts: Record<string, ContractData> = {}
    const profile = buildTenantDetailsProfile(
      'chris',
      [chris, sam],
      properties,
      (id) => contracts[id]
    )
    expect(profile?.roommates).toHaveLength(1)
    expect(profile?.roommates[0]?.name).toBe('Sam Rivera')
    expect(profile?.officialTenantsOnProperty).toBe(2)
    expect(profile?.propertyOccupancyStatement).toBe('1 of 2 tenants on this property')
    expect(profile?.separateLeaseFromRoommates).toBe(true)
    expect(profile?.sharesLeaseWithRoommates).toBe(false)
  })

  it('defaults occupancy from roommate count and rental type', () => {
    expect(resolveOccupancyArrangement(makeClient({ id: 'a', name: 'A', email: 'a@x.com' }), property, 0)).toBe(
      'entire_home'
    )
    expect(
      resolveOccupancyArrangement(
        makeClient({ id: 'a', name: 'A', email: 'a@x.com' }),
        { ...property, propertyType: 'Apartment' },
        1
      )
    ).toBe('shared_apartment')
  })
})
