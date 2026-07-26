import { describe, expect, it } from 'vitest'
import {
  isWholeUnitSingleTenantLease,
  leaseCoTenantsAmong,
  propertySurfacesBedAssignment,
} from '@/lib/furnishedOccupancy'
import type { Client, Property } from '@/types'

function client(
  partial: Partial<Client> & Pick<Client, 'id' | 'name' | 'email'>
): Client {
  return {
    businessName: '',
    phone: '',
    projectType: 'House',
    projectName: '100 Test St',
    projectStatus: 'In Progress',
    contractStatus: 'Signed',
    paymentStatus: 'Paid',
    isOfficialClient: true,
    notes: [],
    deadlines: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const property: Property = {
  id: 'p1',
  address: '100 Test St',
  propertyType: 'Single-Family Home',
  unitCount: 1,
  bedrooms: 2,
  maxTenants: 4,
  monthlyRent: 1800,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('whole-unit lease bed surface', () => {
  it('treats solo entire-home tenants as whole-unit leases', () => {
    const solo = client({
      id: 'lisa',
      name: 'Lisa',
      email: 'lisa@example.com',
      occupancyArrangement: 'entire_home',
    })
    expect(isWholeUnitSingleTenantLease(solo, property, [])).toBe(true)
    expect(propertySurfacesBedAssignment(property, [solo])).toBe(false)
  })

  it('hides beds for entireHomeOnly listings even when vacant', () => {
    expect(
      propertySurfacesBedAssignment({ ...property, entireHomeOnly: true }, [])
    ).toBe(false)
  })

  it('keeps bed UI for room rentals even when temporarily alone', () => {
    const roomer = client({
      id: 'marcus',
      name: 'Marcus',
      email: 'marcus@example.com',
      occupancyArrangement: 'room_rental',
      preferredOccupancyMode: 'private_room',
    })
    expect(isWholeUnitSingleTenantLease(roomer, property, [])).toBe(false)
    expect(propertySurfacesBedAssignment(property, [roomer])).toBe(true)
  })

  it('re-enables beds when a co-tenant joins the same lease', () => {
    const a = client({
      id: 'a',
      name: 'A',
      email: 'a@example.com',
      occupancyArrangement: 'entire_home',
      leaseGroupId: 'lease-1',
    })
    const b = client({
      id: 'b',
      name: 'B',
      email: 'b@example.com',
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-1',
    })
    expect(leaseCoTenantsAmong(a, [a, b])).toHaveLength(1)
    expect(isWholeUnitSingleTenantLease(a, property, [a, b])).toBe(false)
    expect(propertySurfacesBedAssignment(property, [a, b])).toBe(true)
  })

  it('treats custom rentShare equal to unit rent as whole-unit', () => {
    const solo = client({
      id: 'full',
      name: 'Full',
      email: 'full@example.com',
      rentShareAmount: 1800,
    })
    expect(isWholeUnitSingleTenantLease(solo, property, [])).toBe(true)
  })
})
