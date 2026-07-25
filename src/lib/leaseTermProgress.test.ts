import { describe, expect, it } from 'vitest'
import { getLeaseTermProgress } from '@/lib/clientUtils'
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

describe('getLeaseTermProgress', () => {
  it('reports mid-term percent, month progress, and days elapsed', () => {
    const progress = getLeaseTermProgress(
      makeClient(),
      makeContract(),
      new Date(2026, 6, 1) // Jul 1
    )
    expect(progress.startDate).toBe('2026-01-01')
    expect(progress.endDate).toBe('2026-12-31')
    expect(progress.currentMonth).toBe(6)
    expect(progress.termMonths).toBe(12)
    expect(progress.percentComplete).toBeGreaterThan(40)
    expect(progress.percentComplete).toBeLessThan(60)
    expect(progress.daysElapsed).toBeGreaterThan(170)
    expect(progress.showEndingAlert).toBe(false)
  })

  it('highlights days left within three months of end', () => {
    const progress = getLeaseTermProgress(
      makeClient(),
      makeContract(),
      new Date(2026, 10, 1) // Nov 1 — ~60 days before Dec 31
    )
    expect(progress.showEndingAlert).toBe(true)
    expect(progress.daysRemaining).toBe(60)
    expect(progress.percentComplete).toBeGreaterThan(80)
  })

  it('omits progress metrics for leases that have not started yet', () => {
    const progress = getLeaseTermProgress(
      makeClient(),
      makeContract({ startDate: '2026-08-01', completionDate: '2027-07-31' }),
      new Date(2026, 6, 1)
    )
    expect(progress.state).toBe('Upcoming')
    expect(progress.startDate).toBe('2026-08-01')
    expect(progress.percentComplete).toBeNull()
    expect(progress.daysElapsed).toBeNull()
    expect(progress.totalDays).toBeNull()
    expect(progress.showEndingAlert).toBe(false)
  })
})
