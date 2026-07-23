import { describe, expect, it } from 'vitest'
import {
  confidenceLabel,
  dedupeScannedRows,
  displayScanValue,
  extractTextFromPdfBytes,
  formatLeaseLengthLabel,
  isAllowedLeaseImportFile,
  parseLeaseText,
  type ScannedLeaseRow,
} from '@/lib/leaseScan'

describe('parseLeaseText', () => {
  it('extracts tenant, address, rent, and dates from a sample lease', () => {
    const text = `
      RESIDENTIAL LEASE AGREEMENT
      Tenant: Jordan Lee
      Property: 1420 Maple Street, Austin, TX 78701
      Monthly rent: $1,850.00
      Lease start date: 01/01/2026
      Lease end date: 12/31/2026
      Lease term: 12 months
      Phone: (512) 555-0142
      Email: jordan.lee@example.com
    `
    const parsed = parseLeaseText(text, 'jordan-lee-lease.pdf')
    expect(parsed.tenantName).toBe('Jordan Lee')
    expect(parsed.address).toMatch(/1420 Maple Street/)
    expect(parsed.rentAmount).toBe('1850')
    expect(parsed.leaseStartDate).toBe('2026-01-01')
    expect(parsed.leaseEndDate).toBe('2026-12-31')
    expect(parsed.leaseLengthMonths).toBe(12)
    expect(parsed.email).toBe('jordan.lee@example.com')
    expect(parsed.phone).toMatch(/512/)
    expect(parsed.nextPaymentDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('infers lease length from start and end dates', () => {
    const parsed = parseLeaseText(
      `
      Lessee: Sam Rivera
      Address: 88 Oak Ave, Denver, CO 80202
      Rent $2200 per month
      Commencement date: March 1, 2026
      Expiration date: August 31, 2026
    `,
      'lease.txt'
    )
    expect(parsed.tenantName).toBe('Sam Rivera')
    expect(parsed.leaseStartDate).toBe('2026-03-01')
    expect(parsed.leaseEndDate).toBe('2026-08-31')
    expect(parsed.leaseLengthMonths).toBe(6)
  })

  it('ignores security deposit amounts when finding monthly rent', () => {
    const parsed = parseLeaseText(
      `
      Tenant: Avery Quinn
      Address: 10 Pine St, Austin, TX 78701
      Security deposit: $3700
      Monthly rent: $1850
      Lease start date: 02/01/2026
      Lease end date: 01/31/2027
    `,
      'avery.pdf'
    )
    expect(parsed.rentAmount).toBe('1850')
  })

  it('reads an explicit next payment due date', () => {
    const parsed = parseLeaseText(
      `
      Tenant: Morgan Blake
      Address: 55 River Rd, Austin, TX 78704
      Monthly rent: $2100
      Lease start date: 01/15/2026
      Next rent payment due: 08/15/2026
    `,
      'morgan.pdf'
    )
    expect(parsed.nextPaymentDueDate).toBe('2026-08-15')
  })
})

describe('extractTextFromPdfBytes', () => {
  it('reads literal Tj strings from a minimal PDF stream', () => {
    const content = 'BT (Tenant: Avery Quinn) Tj ET BT (Monthly rent: $1200) Tj ET'
    const bytes = new TextEncoder().encode(content)
    const text = extractTextFromPdfBytes(bytes)
    expect(text).toContain('Tenant: Avery Quinn')
    expect(text).toContain('Monthly rent: $1200')
  })
})

describe('formatLeaseLengthLabel', () => {
  it('formats months', () => {
    expect(formatLeaseLengthLabel(null)).toBe('—')
    expect(formatLeaseLengthLabel(1)).toBe('1 month')
    expect(formatLeaseLengthLabel(12)).toBe('12 months')
  })
})

describe('display helpers', () => {
  it('shows Not found for empty values', () => {
    expect(displayScanValue('')).toBe('Not found')
    expect(displayScanValue(null)).toBe('Not found')
    expect(displayScanValue('Jordan')).toBe('Jordan')
  })

  it('labels confidence levels', () => {
    expect(confidenceLabel('high')).toBe('High confidence')
    expect(confidenceLabel('review')).toBe('Review suggested')
    expect(confidenceLabel('low')).toBe('Low confidence')
    expect(confidenceLabel('missing')).toBe('Not found')
  })
})

describe('isAllowedLeaseImportFile', () => {
  it('accepts common lease document types', () => {
    const pdf = new File(['lease'], 'lease.pdf', { type: 'application/pdf' })
    expect(isAllowedLeaseImportFile(pdf).ok).toBe(true)
    const csv = new File(['a,b'], 'tenants.csv', { type: 'text/csv' })
    expect(isAllowedLeaseImportFile(csv).ok).toBe(true)
  })

  it('rejects unsafe or empty files', () => {
    const exe = new File(['x'], 'bad.exe', { type: 'application/octet-stream' })
    expect(isAllowedLeaseImportFile(exe).ok).toBe(false)
    const empty = new File([], 'empty.pdf', { type: 'application/pdf' })
    expect(isAllowedLeaseImportFile(empty).ok).toBe(false)
  })
})

describe('dedupeScannedRows', () => {
  const baseConfidence = {
    tenantName: 'high' as const,
    address: 'high' as const,
    rentAmount: 'high' as const,
    leaseStartDate: 'high' as const,
    leaseLengthMonths: 'high' as const,
    leaseEndDate: 'high' as const,
    nextPaymentDueDate: 'review' as const,
    email: 'review' as const,
    phone: 'review' as const,
  }

  function row(partial: Partial<ScannedLeaseRow> & Pick<ScannedLeaseRow, 'id'>): ScannedLeaseRow {
    return {
      tenantName: '',
      address: '',
      rentAmount: '',
      leaseStartDate: '',
      leaseEndDate: '',
      leaseLengthMonths: null,
      nextPaymentDueDate: '',
      email: '',
      phone: '',
      sourceFileName: 'a.pdf',
      sourceFileNames: ['a.pdf'],
      confidence: 'high',
      fieldConfidence: { ...baseConfidence },
      ...partial,
    }
  }

  it('merges the same tenant across two source files', () => {
    const merged = dedupeScannedRows([
      row({
        id: '1',
        tenantName: 'Jordan Lee',
        address: '1420 Maple Street',
        rentAmount: '1850',
        sourceFileName: 'a.pdf',
        sourceFileNames: ['a.pdf'],
      }),
      row({
        id: '2',
        tenantName: 'Jordan Lee',
        address: '1420 Maple Street',
        email: 'jordan@example.com',
        sourceFileName: 'b.pdf',
        sourceFileNames: ['b.pdf'],
      }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].email).toBe('jordan@example.com')
    expect(merged[0].rentAmount).toBe('1850')
    expect(merged[0].sourceFileNames).toEqual(['a.pdf', 'b.pdf'])
  })

  it('flags uncertain same-name different-address pairs', () => {
    const result = dedupeScannedRows([
      row({
        id: '1',
        tenantName: 'Jordan Lee',
        address: '1420 Maple Street',
      }),
      row({
        id: '2',
        tenantName: 'Jordan Lee',
        address: '88 Oak Avenue',
      }),
    ])
    expect(result).toHaveLength(2)
    expect(result[1].possibleDuplicateOf).toBe('1')
  })
})
