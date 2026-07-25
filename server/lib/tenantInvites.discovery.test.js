import { describe, expect, it } from 'vitest'
import {
  createTenantInvite,
  findValidTenantInvite,
  findValidTenantInviteByCode,
  getTenantDiscoveryMode,
  buildLandlordAgencies,
  markTenantInviteUsed,
} from '../../server/lib/tenantInvites.js'
import { availableApplicantSlotsAtAddress } from '../../server/lib/rentalOccupancy.js'

describe('tenant discovery + invites', () => {
  it('defaults discovery mode to public', () => {
    expect(getTenantDiscoveryMode({})).toBe('public')
    expect(getTenantDiscoveryMode({ settings: { tenantDiscoveryMode: 'invite_only' } })).toBe(
      'invite_only'
    )
  })

  it('hides invite-only landlords from public agency search', () => {
    const store = {
      settings: {
        businessName: 'Hidden Homes',
        tenantDiscoveryMode: 'invite_only',
      },
      properties: [{ id: 'p1', address: '10 Main St, City, ST 00000', bedrooms: 1 }],
      clients: [],
      contracts: [],
    }
    const agencies = buildLandlordAgencies(store, { forPublicDiscovery: true })
    expect(agencies.some((a) => a.name === 'Hidden Homes')).toBe(false)
    expect(agencies.some((a) => a.name === 'JMC Development')).toBe(true)
  })

  it('creates one-use connection codes', () => {
    const store = {
      settings: { businessName: 'Open Rentals' },
      tenantInvites: [],
    }
    const { invite } = createTenantInvite(store)
    expect(invite.connectionCode).toMatch(/^[A-F0-9]{8}$/)
    expect(findValidTenantInvite(store, invite.token)).toBeNull()

    const withInvite = { ...store, tenantInvites: [invite] }
    expect(findValidTenantInvite(withInvite, invite.token)?.id).toBe(invite.id)
    expect(findValidTenantInviteByCode(withInvite, invite.connectionCode)?.id).toBe(invite.id)

    const used = markTenantInviteUsed(withInvite, invite.token, 'user-1')
    expect(findValidTenantInvite(used, invite.token)).toBeNull()
    expect(findValidTenantInviteByCode(used, invite.connectionCode)).toBeNull()
  })

  it('accepts a custom invite code and future lease start', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const y = tomorrow.getFullYear()
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const d = String(tomorrow.getDate()).padStart(2, '0')
    const leaseStartDate = `${y}-${m}-${d}`

    const store = {
      settings: { businessName: 'Open Rentals' },
      tenantInvites: [],
      properties: [{ id: 'p1', address: '10 Main St', bedrooms: 1 }],
    }
    const { invite, error } = createTenantInvite(store, {
      propertyAddress: '10 Main St',
      leaseStartDate,
      leaseLengthMonths: 12,
      connectionCode: 'HOME-2026',
      phone: '5551234567',
    })
    expect(error).toBeUndefined()
    expect(invite.connectionCode).toBe('HOME-2026')
    expect(invite.leaseStartDate).toBe(leaseStartDate)
    expect(invite.leaseLengthMonths).toBe(12)
    expect(invite.phone).toBe('5551234567')

    const past = createTenantInvite(store, {
      propertyAddress: '10 Main St',
      leaseStartDate: '2000-01-01',
      leaseLengthMonths: 12,
    })
    expect(past.error).toMatch(/future/i)
  })

  it('reports no occupancy when official tenants fill maxTenants', () => {
    const store = {
      properties: [
        {
          id: 'p1',
          address: '10 Main St',
          bedrooms: 1,
          bedroomsLayout: [
            {
              id: 'br1',
              label: 'Bedroom 1',
              beds: [{ id: 'bed1', label: 'Bed 1', size: 'twin', capacity: 1 }],
            },
          ],
          maxTenants: 1,
        },
      ],
      clients: [
        {
          id: 'c1',
          isOfficialClient: true,
          projectName: '10 Main St',
        },
      ],
    }
    const result = availableApplicantSlotsAtAddress(store, '10 Main St')
    expect(result.available).toBe(false)
    expect(result.slots).toBe(0)
  })
})
