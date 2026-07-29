import { describe, expect, it } from 'vitest'
import {
  computeLeaseEndDate,
  computeLeaseStartDate,
  getLeaseRentSchedule,
  listDefaultLeaseOptions,
  listUpcomingSeasonalLeaseStarts,
  normalizeCustomLeaseEras,
  resolveDefaultLeaseDates,
} from '@/lib/leaseSchedule'
import type { Client, ContractData } from '@/types'

describe('seasonal lease start dates', () => {
  it('uses January 1 when asOf is January 1', () => {
    expect(computeLeaseStartDate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('uses August 1 between January 2 and August 1', () => {
    expect(computeLeaseStartDate(new Date(2026, 0, 2))).toBe('2026-08-01')
    expect(computeLeaseStartDate(new Date(2026, 6, 23))).toBe('2026-08-01')
    expect(computeLeaseStartDate(new Date(2026, 7, 1))).toBe('2026-08-01')
  })

  it('uses January 1 next year after August 1', () => {
    expect(computeLeaseStartDate(new Date(2026, 7, 2))).toBe('2027-01-01')
    expect(computeLeaseStartDate(new Date(2026, 11, 15))).toBe('2027-01-01')
  })

  it('pairs 12-month terms with Dec 31 / Jul 31 ends', () => {
    expect(computeLeaseEndDate('2026-01-01', 12)).toBe('2026-12-31')
    expect(computeLeaseEndDate('2026-08-01', 12)).toBe('2027-07-31')
  })
})

describe('listUpcomingSeasonalLeaseStarts', () => {
  it('returns the next January and August starts', () => {
    const options = listUpcomingSeasonalLeaseStarts(new Date(2026, 6, 22))
    expect(options.map((o) => o.date)).toEqual(['2026-08-01', '2027-01-01'])
    expect(options[0].label).toBe('August 1, 2026')
    expect(options[1].label).toBe('January 1, 2027')
  })
})

describe('listDefaultLeaseOptions', () => {
  it('lists seasonal lengths plus custom eras', () => {
    const options = listDefaultLeaseOptions(
      {
        customLeaseEras: [
          {
            id: 'era-1',
            startDate: '2026-09-01',
            endDate: '2027-02-28',
            label: 'Fall short term',
          },
        ],
      },
      new Date(2026, 6, 23)
    )
    expect(options.filter((o) => o.kind === 'seasonal').map((o) => o.leaseLengthMonths)).toEqual([
      6, 12, 18, 24,
    ])
    expect(options.find((o) => o.id === 'era-1')).toMatchObject({
      kind: 'custom',
      leaseStartDate: '2026-09-01',
      leaseEndDate: '2027-02-28',
      leaseLengthMonths: 6,
      label: 'Fall short term',
    })
  })

  it('migrates legacy single custom dates into eras', () => {
    const eras = normalizeCustomLeaseEras({
      customDefaultLeaseDates: true,
      defaultLeaseStartDate: '2026-09-01',
      defaultLeaseEndDate: '2027-08-31',
    })
    expect(eras).toEqual([
      {
        id: 'legacy-custom-default',
        startDate: '2026-09-01',
        endDate: '2027-08-31',
        label: 'Custom lease era',
      },
    ])
  })
})

describe('resolveDefaultLeaseDates', () => {
  it('applies seasonal defaults when custom is off', () => {
    const resolved = resolveDefaultLeaseDates(
      { customDefaultLeaseDates: false },
      12,
      new Date(2026, 6, 23)
    )
    expect(resolved).toEqual({
      leaseStartDate: '2026-08-01',
      leaseEndDate: '2027-07-31',
      leaseLengthMonths: 12,
      usedCustomDates: false,
    })
  })

  it('applies landlord custom calendar dates when enabled', () => {
    const resolved = resolveDefaultLeaseDates(
      {
        customDefaultLeaseDates: true,
        defaultLeaseStartDate: '2026-09-01',
        defaultLeaseEndDate: '2027-08-31',
      },
      12,
      new Date(2026, 6, 23)
    )
    expect(resolved).toEqual({
      leaseStartDate: '2026-09-01',
      leaseEndDate: '2027-08-31',
      leaseLengthMonths: 12,
      usedCustomDates: true,
    })
  })

  it('falls back to seasonal when custom dates are invalid', () => {
    const resolved = resolveDefaultLeaseDates(
      {
        customDefaultLeaseDates: true,
        defaultLeaseStartDate: '2026-09-01',
        defaultLeaseEndDate: '2026-08-01',
      },
      12,
      new Date(2026, 6, 23)
    )
    expect(resolved.usedCustomDates).toBe(false)
    expect(resolved.leaseStartDate).toBe('2026-08-01')
  })

  it('resolves an explicit option id', () => {
    const resolved = resolveDefaultLeaseDates(
      {
        customLeaseEras: [
          { id: 'era-1', startDate: '2026-09-01', endDate: '2027-02-28' },
        ],
      },
      12,
      new Date(2026, 6, 23),
      'era-1'
    )
    expect(resolved).toEqual({
      leaseStartDate: '2026-09-01',
      leaseEndDate: '2027-02-28',
      leaseLengthMonths: 6,
      usedCustomDates: true,
    })
  })
})

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    name: 'Casey Active',
    email: 'active@leased.test',
    projectStatus: 'Contract Signed',
    contractStatus: 'Signed',
    paymentStatus: 'Paid',
    isOfficialClient: true,
    createdAt: '2025-08-01T00:00:00.000Z',
    leaseLengthMonths: 12,
    deadlines: [],
    ...overrides,
  } as Client
}

function makeContract(overrides: Partial<ContractData> = {}): ContractData {
  return {
    id: 'k1',
    clientId: 'c1',
    status: 'Signed',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
    startDate: '2025-08-01',
    completionDate: '2026-08-31',
    ...overrides,
  } as ContractData
}

describe('getLeaseRentSchedule unpaid source of truth', () => {
  it('does not treat completed past dues as next/overdue when all prior months are paid', () => {
    const dues = [
      '2025-08-01',
      '2025-09-01',
      '2025-10-01',
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
    ]
    const client = makeClient({
      deadlines: dues.map((date, i) => ({
        id: `d-${i}`,
        type: 'payment' as const,
        date,
        label: `Rent ${date}`,
        completed: date <= '2026-07-01',
        paidAt: date <= '2026-07-01' ? date : undefined,
      })),
    })
    const schedule = getLeaseRentSchedule(
      client,
      makeContract(),
      new Date(2026, 6, 22)
    )

    expect(schedule.nextDueDate).toBe('2026-08-01')
    expect(schedule.daysUntilNextDue).toBe(10)
    expect(schedule.overduePaymentCount).toBe(0)
    expect(schedule.finalDueDate).toBe('2026-08-01')
    expect(schedule.payments.filter((p) => p.status === 'overdue')).toHaveLength(0)
  })

  it('reports paid-in-full when every installment is completed', () => {
    const dues = [
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
    ]
    const client = makeClient({
      deadlines: dues.map((date, i) => ({
        id: `d-${i}`,
        type: 'payment' as const,
        date,
        label: `Rent ${date}`,
        completed: true,
        paidAt: date,
      })),
    })
    const schedule = getLeaseRentSchedule(
      client,
      makeContract({ startDate: '2026-01-01', completionDate: '2026-07-31' }),
      new Date(2026, 6, 22)
    )

    expect(schedule.nextDueDate).toBeNull()
    expect(schedule.daysUntilNextDue).toBeNull()
    expect(schedule.overduePaymentCount).toBe(0)
  })

  it('counts only unpaid past-due months toward overdue', () => {
    const client = makeClient({
      paymentStatus: 'Overdue',
      deadlines: [
        {
          id: 'd1',
          type: 'payment',
          date: '2026-06-01',
          label: 'June',
          completed: true,
          paidAt: '2026-06-01',
        },
        {
          id: 'd2',
          type: 'payment',
          date: '2026-07-01',
          label: 'July',
          completed: false,
        },
      ],
    })
    const schedule = getLeaseRentSchedule(
      client,
      makeContract({ startDate: '2026-06-01', completionDate: '2026-07-31' }),
      new Date(2026, 6, 22)
    )
    expect(schedule.nextDueDate).toBe('2026-07-01')
    expect(schedule.daysUntilNextDue).toBeLessThan(0)
    expect(schedule.overduePaymentCount).toBe(1)
  })
})
