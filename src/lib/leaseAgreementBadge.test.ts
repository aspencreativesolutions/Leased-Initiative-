import { describe, expect, it } from 'vitest'
import {
  getLeaseAgreementBadgeLabel,
  getLeaseAgreementBadgeRank,
  getLeaseAgreementStatusFilterLabel,
  isLeaseAgreementStatusFilter,
  LEASE_AGREEMENT_STATUS_FILTERS,
  nextLeaseAgreementStatusFilter,
} from '@/lib/clientUtils'
import type { Client, ContractData } from '@/types'

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    name: 'Ada Tenant',
    email: 'ada@example.com',
    projectStatus: 'Contract Signed',
    contractStatus: 'Signed',
    isOfficialClient: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    leaseLengthMonths: 12,
    ...overrides,
  }
}

function makeContract(overrides: Partial<ContractData> = {}): ContractData {
  return {
    id: 'k1',
    clientId: 'c1',
    status: 'Signed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    startDate: '2026-01-01',
    completionDate: '2026-12-31',
    signedAt: '2025-12-15',
    ...overrides,
  } as ContractData
}

const demoToday = new Date(2026, 6, 22) // July 22, 2026

describe('getLeaseAgreementBadgeLabel', () => {
  it('labels Sent leases as Sent', () => {
    expect(
      getLeaseAgreementBadgeLabel(
        makeClient({
          contractStatus: 'Sent',
          projectStatus: 'Contract Sent',
          isOfficialClient: false,
        }),
        makeContract({
          status: 'Sent',
          startDate: '2026-08-01',
          completionDate: '2027-07-31',
          signedAt: undefined,
          sentAt: '2026-07-01',
        }),
        demoToday
      )
    ).toBe('Sent')
  })

  it('labels signed upcoming leases as Signed', () => {
    expect(
      getLeaseAgreementBadgeLabel(
        makeClient(),
        makeContract({ startDate: '2026-08-01', completionDate: '2027-07-31' }),
        demoToday
      )
    ).toBe('Signed')
  })

  it('labels signed in-term leases as Active once the start date has passed', () => {
    expect(
      getLeaseAgreementBadgeLabel(makeClient(), makeContract(), demoToday)
    ).toBe('Active')
  })

  it('labels ending-soon signed leases as Active', () => {
    expect(
      getLeaseAgreementBadgeLabel(
        makeClient(),
        makeContract({
          startDate: '2025-08-01',
          completionDate: '2026-07-31',
        }),
        demoToday
      )
    ).toBe('Active')
  })

  it('ranks Active after Signed for spreadsheet status column order', () => {
    expect(getLeaseAgreementBadgeRank('Sent')).toBeLessThan(
      getLeaseAgreementBadgeRank('Signed')
    )
    expect(getLeaseAgreementBadgeRank('Signed')).toBeLessThan(
      getLeaseAgreementBadgeRank('Active')
    )
  })
})

describe('LEASE_AGREEMENT_STATUS_FILTERS', () => {
  it('includes only Signed, Sent, and Active for the Display Settings cycle', () => {
    expect(LEASE_AGREEMENT_STATUS_FILTERS).toEqual([
      'Signed',
      'Sent',
      'Active',
    ])
  })

  it('recognizes filter values used by Display Settings → Lease Status', () => {
    expect(isLeaseAgreementStatusFilter('Signed')).toBe(true)
    expect(isLeaseAgreementStatusFilter('Active')).toBe(true)
    expect(isLeaseAgreementStatusFilter('Not Started')).toBe(false)
    expect(isLeaseAgreementStatusFilter('Unknown')).toBe(false)
    expect(isLeaseAgreementStatusFilter(null)).toBe(false)
  })

  it('cycles Any → Signed → Sent → Active → Any', () => {
    expect(nextLeaseAgreementStatusFilter(null)).toBe('Signed')
    expect(nextLeaseAgreementStatusFilter('Signed')).toBe('Sent')
    expect(nextLeaseAgreementStatusFilter('Sent')).toBe('Active')
    expect(nextLeaseAgreementStatusFilter('Active')).toBe(null)
  })

  it('labels null as Any for the cycle button', () => {
    expect(getLeaseAgreementStatusFilterLabel(null)).toBe('Any')
    expect(getLeaseAgreementStatusFilterLabel('Signed')).toBe('Signed')
  })

  it('matches badge labels so Filter can show only that status', () => {
    const signedLabel = getLeaseAgreementBadgeLabel(
      makeClient(),
      makeContract({ startDate: '2026-08-01', completionDate: '2027-07-31' }),
      demoToday
    )
    const sentLabel = getLeaseAgreementBadgeLabel(
      makeClient({
        contractStatus: 'Sent',
        projectStatus: 'Contract Sent',
        isOfficialClient: false,
      }),
      makeContract({
        status: 'Sent',
        startDate: '2026-08-01',
        completionDate: '2027-07-31',
        signedAt: undefined,
        sentAt: '2026-07-01',
      }),
      demoToday
    )
    const activeLabel = getLeaseAgreementBadgeLabel(
      makeClient(),
      makeContract(),
      demoToday
    )

    expect(signedLabel).toBe('Signed')
    expect(sentLabel).toBe('Sent')
    expect(activeLabel).toBe('Active')
    expect(isLeaseAgreementStatusFilter(signedLabel)).toBe(true)
    expect(isLeaseAgreementStatusFilter(sentLabel)).toBe(true)
    expect(isLeaseAgreementStatusFilter(activeLabel)).toBe(true)
  })
})
