import { describe, expect, it } from 'vitest'
import {
  getLastPaymentMadeOn,
  isCurrentEarlyPayment,
  isPaidBeforeDue,
  parsePaymentTenantHash,
  paymentTenantHref,
  paymentTenantRemindHref,
  toDisplayStatus,
} from '@/lib/paymentTenantRows'
import type { PortalRentPayment } from '@/types'

describe('getLastPaymentMadeOn', () => {
  it('returns the most recent paidAt among completed rent payments', () => {
    const payments: PortalRentPayment[] = [
      { dueDate: '2026-05-01', label: 'May', status: 'paid', paidAt: '2026-05-01' },
      { dueDate: '2026-06-01', label: 'June', status: 'paid_late', paidAt: '2026-06-14' },
      { dueDate: '2026-07-01', label: 'July', status: 'overdue' },
    ]
    expect(getLastPaymentMadeOn(payments)).toBe('2026-06-14')
  })

  it('falls back to deposit paidAt when no rent payments are completed', () => {
    expect(
      getLastPaymentMadeOn([], {
        invoice: { paidAt: '2026-07-10' } as never,
        depositPaymentConfirmedAt: undefined,
      })
    ).toBe('2026-07-10')
  })
})

describe('Paid Early display (due date = 1st)', () => {
  it('treats payment on the due date (1st) as on time, not early', () => {
    expect(
      isPaidBeforeDue({
        dueDate: '2026-07-01',
        paidAt: '2026-07-01',
        status: 'paid',
      })
    ).toBe(false)
  })

  it('treats payment before the 1st as early', () => {
    expect(
      isPaidBeforeDue({
        dueDate: '2026-07-01',
        paidAt: '2026-06-28',
        status: 'paid_early',
      })
    ).toBe(true)
  })

  it('stops showing Paid Early once the due date arrives', () => {
    const julyPaidEarly: PortalRentPayment = {
      dueDate: '2026-07-01',
      label: 'July',
      status: 'paid_early',
      paidAt: '2026-06-28',
    }
    expect(isCurrentEarlyPayment(julyPaidEarly, '2026-06-30')).toBe(true)
    expect(isCurrentEarlyPayment(julyPaidEarly, '2026-07-01')).toBe(false)
    expect(
      toDisplayStatus('Paid', 30, julyPaidEarly, '2026-07-01')
    ).toBe('Paid')
  })

  it('does not use historical early months when last payment was on the 1st', () => {
    const historicalEarly: PortalRentPayment = {
      dueDate: '2026-04-01',
      label: 'April',
      status: 'paid_early',
      paidAt: '2026-03-27',
    }
    expect(isCurrentEarlyPayment(historicalEarly, '2026-07-22')).toBe(false)
    expect(
      toDisplayStatus('Paid', 9, historicalEarly, '2026-07-22')
    ).toBe('Paid')
  })

  it('still shows Paid Early for prepaid future months', () => {
    const augustPrepaid: PortalRentPayment = {
      dueDate: '2026-08-01',
      label: 'August',
      status: 'paid_early',
      paidAt: '2026-07-18',
    }
    expect(isCurrentEarlyPayment(augustPrepaid, '2026-07-22')).toBe(true)
    expect(
      toDisplayStatus('Deposit Paid', 10, augustPrepaid, '2026-07-22')
    ).toBe('Paid Early')
  })
})

describe('payment tenant deep links', () => {
  it('builds last/next focus hashes', () => {
    expect(paymentTenantHref('abc', 'last')).toBe('/studio/payments#payment-tenant-abc--last')
    expect(paymentTenantHref('abc', 'next')).toBe('/studio/payments#payment-tenant-abc--next')
  })

  it('builds overdue reminder deep links', () => {
    expect(paymentTenantRemindHref('abc')).toBe(
      '/studio/payments?status=overdue#payment-tenant-abc--remind'
    )
  })

  it('parses focus from hash', () => {
    expect(parsePaymentTenantHash('#payment-tenant-abc--last')).toEqual({
      anchorId: 'payment-tenant-abc',
      focus: 'last',
    })
    expect(parsePaymentTenantHash('#payment-tenant-abc--remind')).toEqual({
      anchorId: 'payment-tenant-abc',
      focus: 'remind',
    })
    expect(parsePaymentTenantHash('payment-tenant-abc')).toEqual({
      anchorId: 'payment-tenant-abc',
      focus: null,
    })
  })
})
