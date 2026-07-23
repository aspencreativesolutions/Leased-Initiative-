import { describe, expect, it } from 'vitest'
import {
  buildOfficialPaymentColumnPresentation,
  buildPaymentStatusPresentation,
  resolvePaymentSituation,
} from '@/lib/paymentStatusPresentation'
import type { PortalRentPayment } from '@/types'

const julyPaid: PortalRentPayment = {
  dueDate: '2026-07-01',
  label: 'July',
  status: 'paid',
  paidAt: '2026-07-01',
}

const augustUpcoming: PortalRentPayment = {
  dueDate: '2026-08-01',
  label: 'August',
  status: 'upcoming',
}

describe('resolvePaymentSituation', () => {
  it('marks Casey-style tenant as current when final rent is still >7 days out', () => {
    const situation = resolvePaymentSituation({
      payments: [julyPaid, augustUpcoming],
      nextDueDate: '2026-08-01',
      daysUntilNextDue: 10,
      finalDueDate: '2026-08-01',
      overduePaymentCount: 0,
    })
    expect(situation).toBe('current')
  })

  it('marks final payment due when the last installment is within 7 days', () => {
    expect(
      resolvePaymentSituation({
        payments: [julyPaid, augustUpcoming],
        nextDueDate: '2026-08-01',
        daysUntilNextDue: 5,
        finalDueDate: '2026-08-01',
        overduePaymentCount: 0,
      })
    ).toBe('final_payment_due')
  })

  it('marks fully paid leases as paid in full', () => {
    expect(
      resolvePaymentSituation({
        payments: [julyPaid],
        nextDueDate: null,
        daysUntilNextDue: null,
        finalDueDate: '2026-07-01',
        overduePaymentCount: 0,
      })
    ).toBe('paid_in_full')
  })

  it('marks overdue with remaining balance after partial pay as partially paid', () => {
    expect(
      resolvePaymentSituation({
        payments: [{ ...julyPaid, status: 'overdue', paidAt: undefined }],
        nextDueDate: '2026-07-01',
        daysUntilNextDue: -21,
        finalDueDate: '2026-12-01',
        overduePaymentCount: 1,
        amountPaidTowardPeriod: 800,
        remainingBalance: 400,
      })
    ).toBe('partially_paid')
  })
})

describe('buildPaymentStatusPresentation', () => {
  it('builds Casey Active card copy', () => {
    const presentation = buildPaymentStatusPresentation({
      payments: [julyPaid, augustUpcoming],
      nextDueDate: '2026-08-01',
      daysUntilNextDue: 10,
      finalDueDate: '2026-08-01',
      overduePaymentCount: 0,
    })
    expect(presentation.statusLabel).toBe('Current')
    expect(presentation.lastPaymentLabel).toBe('Last payment on time ✓')
    expect(presentation.lastPaymentDateLabel).toMatch(/July 1/)
    expect(presentation.duePrimaryShort).toBe('Final payment due')
    expect(presentation.dueSecondaryShort).toMatch(/August 1/)
    expect(presentation.tone).toBe('positive')
  })

  it('never uses Next for overdue copy', () => {
    const presentation = buildPaymentStatusPresentation({
      payments: [
        { dueDate: '2026-06-01', label: 'June', status: 'paid', paidAt: '2026-06-01' },
        { dueDate: '2026-07-01', label: 'July', status: 'overdue' },
      ],
      nextDueDate: '2026-07-01',
      daysUntilNextDue: -21,
      finalDueDate: '2026-12-01',
      overduePaymentCount: 1,
    })
    expect(presentation.dueLabel).toMatch(/Payment overdue by 21 days/)
    expect(presentation.dueDetailLabel).toMatch(/Was due/)
    expect(presentation.dueLabel.toLowerCase()).not.toContain('next')
  })
})

describe('buildOfficialPaymentColumnPresentation', () => {
  it('shows On Time with next-payment countdown and Paid · processor hover', () => {
    const column = buildOfficialPaymentColumnPresentation({
      nextDueDate: '2026-08-01',
      daysUntilNextDue: 23,
      overduePaymentCount: 0,
      lastPaidOn: '2026-07-01',
      paymentProvider: 'stripe',
    })
    expect(column.kind).toBe('on_time')
    expect(column.tagLabel).toBe('On Time')
    expect(column.tagHoverLabel).toBe('Paid July 1 · Stripe')
    expect(column.nextPaymentSubline).toBe('Next payment in 23 days')
    expect(column.ariaLabel).toMatch(/Payment on time/)
    expect(column.ariaLabel).toMatch(/July 1, 2026/)
    expect(column.ariaLabel).toMatch(/Stripe/)
    expect(column.ariaLabel).toMatch(/August 1, 2026/)
    expect(column.tone).toBe('positive')
  })

  it('formats On Time hover for PayPal and Square', () => {
    expect(
      buildOfficialPaymentColumnPresentation({
        nextDueDate: '2026-08-01',
        daysUntilNextDue: 10,
        overduePaymentCount: 0,
        lastPaidOn: '2026-07-01',
        paymentProvider: 'paypal',
      }).tagHoverLabel
    ).toBe('Paid July 1 · PayPal')

    expect(
      buildOfficialPaymentColumnPresentation({
        nextDueDate: '2026-08-01',
        daysUntilNextDue: 10,
        overduePaymentCount: 0,
        lastPaidOn: '2026-07-01',
        paymentProvider: 'square',
      }).tagHoverLabel
    ).toBe('Paid July 1 · Square')
  })

  it('collapses paid-in-full / due-soon situations to On Time only', () => {
    const paidInFull = buildOfficialPaymentColumnPresentation({
      nextDueDate: null,
      daysUntilNextDue: null,
      overduePaymentCount: 0,
      lastPaidOn: '2026-07-01',
      paymentProvider: 'stripe',
    })
    expect(paidInFull.tagLabel).toBe('On Time')
    expect(paidInFull.nextPaymentSubline).toBe('All payments complete')
    expect(paidInFull.tagHoverLabel).toBe('Paid July 1 · Stripe')

    const dueSoon = buildOfficialPaymentColumnPresentation({
      nextDueDate: '2026-08-01',
      daysUntilNextDue: 3,
      overduePaymentCount: 0,
      lastPaidOn: '2026-07-01',
      paymentProvider: 'paypal',
    })
    expect(dueSoon.tagLabel).toBe('On Time')
    expect(dueSoon.nextPaymentSubline).toBe('Next payment in 3 days')
    expect(dueSoon.tagHoverLabel).toBe('Paid July 1 · PayPal')
  })

  it('shows Overdue with days-late hover from the oldest unpaid due', () => {
    const column = buildOfficialPaymentColumnPresentation({
      nextDueDate: '2026-07-01',
      daysUntilNextDue: -12,
      overduePaymentCount: 2,
    })
    expect(column.kind).toBe('overdue')
    expect(column.tagLabel).toBe('Overdue')
    expect(column.tagHoverLabel).toBe('12 days late · Due July 1')
    expect(column.nextPaymentSubline).toBeNull()
    expect(column.daysOverdue).toBe(12)
    expect(column.ariaLabel).toMatch(/Payment overdue by 12 days/)
    expect(column.ariaLabel).toMatch(/July 1, 2026/)
    expect(column.tone).toBe('error')
  })

  it('does not mark future payments as overdue from remaining balance alone', () => {
    const column = buildOfficialPaymentColumnPresentation({
      nextDueDate: '2026-08-01',
      daysUntilNextDue: 10,
      overduePaymentCount: 0,
      lastPaidOn: '2026-07-01',
      paymentProvider: 'stripe',
    })
    expect(column.kind).toBe('on_time')
    expect(column.tagLabel).toBe('On Time')
  })
})
