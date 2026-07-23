import { describe, expect, it } from 'vitest'
import {
  formatLeaseDurationHoverLine,
  formatLeaseStatusHoverDate,
  getLeaseStatusDetails,
  getLeaseStatusHoverDetail,
} from '@/lib/clientUtils'
import type { Client, ContractData } from '@/types'

function makeClient(partial: Partial<Client> & Pick<Client, 'id' | 'name' | 'email'>): Client {
  return {
    businessName: '',
    phone: '',
    projectType: 'House',
    projectName: '100 Main St',
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

function makeContract(partial: Partial<ContractData> = {}): ContractData {
  return {
    id: 'c1',
    clientId: 't1',
    status: 'Signed',
    startDate: '2026-01-01',
    completionDate: '2026-12-31',
    createdAt: '2025-11-01T00:00:00.000Z',
    ...partial,
  } as ContractData
}

describe('formatLeaseDurationHoverLine', () => {
  it('formats fixed terms as N Mo', () => {
    expect(formatLeaseDurationHoverLine(6)).toBe('6 Mo')
    expect(formatLeaseDurationHoverLine(12)).toBe('12 Mo')
    expect(formatLeaseDurationHoverLine(18)).toBe('18 Mo')
  })

  it('uses MTM when term is missing or non-positive', () => {
    expect(formatLeaseDurationHoverLine(undefined)).toBe('MTM')
    expect(formatLeaseDurationHoverLine(0)).toBe('MTM')
  })
})

describe('formatLeaseStatusHoverDate', () => {
  it('formats as MM/DD/YY', () => {
    expect(formatLeaseStatusHoverDate('2026-01-01')).toBe('01/01/26')
    expect(formatLeaseStatusHoverDate('2026-08-01')).toBe('08/01/26')
    expect(formatLeaseStatusHoverDate('2027-01-31')).toBe('01/31/27')
    expect(formatLeaseStatusHoverDate('2027-12-14')).toBe('12/14/27')
  })
})

describe('getLeaseStatusDetails badge labels', () => {
  it('shows Active once the lease has begun', () => {
    const client = makeClient({ id: 't1', name: 'Ada', email: 'ada@example.com' })
    const contract = makeContract()
    const details = getLeaseStatusDetails(client, contract, new Date('2026-06-15T12:00:00'))
    expect(details.status).toBe('Active')
    expect(details.state).toBe('Active')
  })

  it('shows Active (not progress copy) when ending soon', () => {
    const client = makeClient({ id: 't1', name: 'Ada', email: 'ada@example.com' })
    const contract = makeContract()
    const details = getLeaseStatusDetails(client, contract, new Date('2026-12-15T12:00:00'))
    expect(details.status).toBe('Active')
    expect(details.state).toBe('Ending Soon')
  })

  it('shows Upcoming before the lease starts', () => {
    const client = makeClient({
      id: 't1',
      name: 'Ada',
      email: 'ada@example.com',
      demoLeaseStartDate: '2026-08-01',
      leaseLengthMonths: 12,
    })
    const contract = makeContract({
      startDate: '2026-08-01',
      completionDate: '2027-07-31',
    })
    const details = getLeaseStatusDetails(client, contract, new Date('2026-07-01T12:00:00'))
    expect(details.status).toBe('Upcoming')
    expect(details.state).toBe('Upcoming')
  })
})

describe('getLeaseStatusHoverDetail', () => {
  it('returns a single-line active lease hover summary', () => {
    const hover = getLeaseStatusHoverDetail({
      status: 'Active',
      state: 'Active',
      termMonths: 12,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })
    expect(hover).toEqual({
      summaryLine: '12 Mo · 01/01/26 - 12/31/26',
    })
  })

  it('returns the same compact form for upcoming leases', () => {
    const hover = getLeaseStatusHoverDetail({
      status: 'Upcoming',
      state: 'Upcoming',
      termMonths: 6,
      startDate: '2026-08-01',
      endDate: '2027-01-31',
    })
    expect(hover).toEqual({
      summaryLine: '6 Mo · 08/01/26 - 01/31/27',
    })
  })

  it('formats 18-month ranges on one line', () => {
    const hover = getLeaseStatusHoverDetail({
      status: 'Active',
      state: 'Active',
      termMonths: 18,
      startDate: '2026-06-15',
      endDate: '2027-12-14',
    })
    expect(hover).toEqual({
      summaryLine: '18 Mo · 06/15/26 - 12/14/27',
    })
  })
})
