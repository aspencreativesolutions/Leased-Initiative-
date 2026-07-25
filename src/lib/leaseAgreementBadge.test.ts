import { describe, expect, it } from 'vitest'
import {
  getLeaseAgreementBadgeLabel,
  getLeaseAgreementBadgeRank,
  getLeaseAgreementProgressFilterLabel,
  getLeaseAgreementStatusFilterLabel,
  getLeaseAgreementStatusHoverDetail,
  isLeaseAgreementProgressFilter,
  isLeaseAgreementStatusFilter,
  LEASE_AGREEMENT_PROGRESS_FILTERS,
  LEASE_AGREEMENT_STATUS_FILTERS,
  leaseProgressMatchesFilter,
  nextLeaseAgreementProgressFilter,
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

  it('labels signed in-term leases as Signed once the start date has passed', () => {
    expect(
      getLeaseAgreementBadgeLabel(makeClient(), makeContract(), demoToday)
    ).toBe('Signed')
  })

  it('labels ending-soon signed leases as Signed', () => {
    expect(
      getLeaseAgreementBadgeLabel(
        makeClient(),
        makeContract({
          startDate: '2025-08-01',
          completionDate: '2026-07-31',
        }),
        demoToday
      )
    ).toBe('Signed')
  })

  it('labels completed / expired leases as Signed', () => {
    expect(
      getLeaseAgreementBadgeLabel(
        makeClient({
          projectStatus: 'Completed',
          contractStatus: 'Completed',
        }),
        makeContract({
          status: 'Completed',
          startDate: '2025-01-01',
          completionDate: '2025-12-31',
        }),
        demoToday
      )
    ).toBe('Signed')
  })

  it('ranks Signed after Sent for spreadsheet status column order', () => {
    expect(getLeaseAgreementBadgeRank('Sent')).toBeLessThan(
      getLeaseAgreementBadgeRank('Signed')
    )
  })
})

describe('getLeaseAgreementStatusHoverDetail', () => {
  it('shows lease start and end dates for Signed in-term leases', () => {
    expect(
      getLeaseAgreementStatusHoverDetail(
        'Signed',
        makeClient(),
        makeContract({ startDate: '2026-07-01', completionDate: '2027-06-30' }),
        demoToday
      )
    ).toBe('July 1 – June 30')
  })

  it('shows lease start and end dates for completed agreements labeled Signed', () => {
    expect(
      getLeaseAgreementStatusHoverDetail(
        'Signed',
        makeClient({
          projectStatus: 'Completed',
          contractStatus: 'Completed',
          projectCompletedAt: '2026-07-01T12:00:00.000Z',
        }),
        makeContract({
          status: 'Completed',
          startDate: '2026-08-01',
          completionDate: '2027-07-31',
          signedAt: '2026-07-01',
        }),
        demoToday
      )
    ).toBe('August 1 – July 31')
  })

  it('shows Sent date', () => {
    expect(
      getLeaseAgreementStatusHoverDetail(
        'Sent',
        makeClient({
          contractStatus: 'Sent',
          projectStatus: 'Contract Sent',
          isOfficialClient: false,
        }),
        makeContract({
          status: 'Sent',
          signedAt: undefined,
          sentAt: '2026-07-01',
        }),
        demoToday
      )
    ).toBe('Sent July 1')
  })

  it('falls back to signed date when term dates are missing', () => {
    expect(
      getLeaseAgreementStatusHoverDetail(
        'Signed',
        makeClient(),
        makeContract({
          startDate: undefined,
          completionDate: undefined,
          signedAt: '2026-07-01',
        }),
        demoToday
      )
    ).toBe('Signed July 1')
  })
})

describe('LEASE_AGREEMENT_STATUS_FILTERS', () => {
  it('includes only Signed and Sent for the Display Settings cycle', () => {
    expect(LEASE_AGREEMENT_STATUS_FILTERS).toEqual(['Signed', 'Sent'])
  })

  it('recognizes filter values used by Display Settings → Lease Status', () => {
    expect(isLeaseAgreementStatusFilter('Signed')).toBe(true)
    expect(isLeaseAgreementStatusFilter('Sent')).toBe(true)
    expect(isLeaseAgreementStatusFilter('Active')).toBe(false)
    expect(isLeaseAgreementStatusFilter('Not Started')).toBe(false)
    expect(isLeaseAgreementStatusFilter('Unknown')).toBe(false)
    expect(isLeaseAgreementStatusFilter(null)).toBe(false)
  })

  it('cycles Any → Signed → Sent → Any', () => {
    expect(nextLeaseAgreementStatusFilter(null)).toBe('Signed')
    expect(nextLeaseAgreementStatusFilter('Signed')).toBe('Sent')
    expect(nextLeaseAgreementStatusFilter('Sent')).toBe(null)
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
    const inTermLabel = getLeaseAgreementBadgeLabel(
      makeClient(),
      makeContract(),
      demoToday
    )

    expect(signedLabel).toBe('Signed')
    expect(sentLabel).toBe('Sent')
    expect(inTermLabel).toBe('Signed')
    expect(isLeaseAgreementStatusFilter(signedLabel)).toBe(true)
    expect(isLeaseAgreementStatusFilter(sentLabel)).toBe(true)
    expect(isLeaseAgreementStatusFilter(inTermLabel)).toBe(true)
  })
})

describe('LEASE_AGREEMENT_PROGRESS_FILTERS', () => {
  it('includes Not Started, Ongoing, and Ending Soon for Display Settings', () => {
    expect(LEASE_AGREEMENT_PROGRESS_FILTERS).toEqual([
      'Not Started',
      'Ongoing',
      'Ending Soon',
    ])
  })

  it('recognizes filter values used by Display Settings → Lease Progress', () => {
    expect(isLeaseAgreementProgressFilter('Not Started')).toBe(true)
    expect(isLeaseAgreementProgressFilter('Ongoing')).toBe(true)
    expect(isLeaseAgreementProgressFilter('Ending Soon')).toBe(true)
    expect(isLeaseAgreementProgressFilter('Active')).toBe(false)
    expect(isLeaseAgreementProgressFilter('Signed')).toBe(false)
    expect(isLeaseAgreementProgressFilter(null)).toBe(false)
  })

  it('cycles Any → Not Started → Ongoing → Ending Soon → Any', () => {
    expect(nextLeaseAgreementProgressFilter(null)).toBe('Not Started')
    expect(nextLeaseAgreementProgressFilter('Not Started')).toBe('Ongoing')
    expect(nextLeaseAgreementProgressFilter('Ongoing')).toBe('Ending Soon')
    expect(nextLeaseAgreementProgressFilter('Ending Soon')).toBe(null)
  })

  it('labels null as Any for the cycle button', () => {
    expect(getLeaseAgreementProgressFilterLabel(null)).toBe('Any')
    expect(getLeaseAgreementProgressFilterLabel('Ongoing')).toBe('Ongoing')
  })

  it('matches term progress timeline states', () => {
    expect(leaseProgressMatchesFilter({ state: 'Upcoming' }, null)).toBe(true)
    expect(
      leaseProgressMatchesFilter({ state: 'Upcoming' }, 'Not Started')
    ).toBe(true)
    expect(leaseProgressMatchesFilter({ state: 'Active' }, 'Not Started')).toBe(
      false
    )
    expect(leaseProgressMatchesFilter({ state: 'Active' }, 'Ongoing')).toBe(true)
    expect(
      leaseProgressMatchesFilter({ state: 'Ending Soon' }, 'Ongoing')
    ).toBe(false)
    expect(
      leaseProgressMatchesFilter({ state: 'Ending Soon' }, 'Ending Soon')
    ).toBe(true)
    expect(leaseProgressMatchesFilter({ state: 'Expired' }, 'Ongoing')).toBe(
      false
    )
  })
})
