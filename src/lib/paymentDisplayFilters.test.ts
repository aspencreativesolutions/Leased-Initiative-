import { describe, expect, it } from 'vitest'
import {
  getPaymentStatusFilterLabel,
  nextPaymentMethodFilter,
  nextPaymentStatusFilter,
  parsePaymentStatusQuery,
  paymentStatusFilterMatchesDisplay,
  PAYMENT_METHOD_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTERS,
} from '@/lib/paymentDisplayFilters'

describe('payment status filter cycle', () => {
  it('lists Paid Rent, Overdue Rent, Paid Early, and On Time after Any', () => {
    expect(PAYMENT_STATUS_FILTERS).toEqual([
      'paid',
      'overdue',
      'paid_early',
      'on_time',
    ])
  })

  it('advances Any → Paid Rent → Overdue Rent → Paid Early → On Time → Any', () => {
    expect(nextPaymentStatusFilter(null)).toBe('paid')
    expect(nextPaymentStatusFilter('paid')).toBe('overdue')
    expect(nextPaymentStatusFilter('overdue')).toBe('paid_early')
    expect(nextPaymentStatusFilter('paid_early')).toBe('on_time')
    expect(nextPaymentStatusFilter('on_time')).toBe(null)
  })

  it('labels status filters for the cycle control', () => {
    expect(getPaymentStatusFilterLabel(null)).toBe('Any')
    expect(getPaymentStatusFilterLabel('paid')).toBe('Paid Rent')
    expect(getPaymentStatusFilterLabel('overdue')).toBe('Overdue Rent')
    expect(getPaymentStatusFilterLabel('paid_early')).toBe('Paid Early')
    expect(getPaymentStatusFilterLabel('on_time')).toBe('On Time')
  })

  it('maps status filters to payment row display values', () => {
    expect(paymentStatusFilterMatchesDisplay('paid', 'Paid')).toBe(true)
    expect(paymentStatusFilterMatchesDisplay('paid', 'Due')).toBe(false)
    expect(paymentStatusFilterMatchesDisplay('overdue', 'Overdue')).toBe(true)
    expect(paymentStatusFilterMatchesDisplay('paid_early', 'Paid Early')).toBe(
      true
    )
    expect(paymentStatusFilterMatchesDisplay('on_time', 'Due')).toBe(true)
    expect(paymentStatusFilterMatchesDisplay('on_time', 'Paid')).toBe(false)
  })

  it('parses Payments status query params', () => {
    expect(parsePaymentStatusQuery('overdue')).toBe('overdue')
    expect(parsePaymentStatusQuery('paid_early')).toBe('paid_early')
    expect(parsePaymentStatusQuery('paid')).toBe('paid')
    expect(parsePaymentStatusQuery('on_time')).toBe('on_time')
    expect(parsePaymentStatusQuery('due')).toBe('on_time')
    expect(parsePaymentStatusQuery('unknown')).toBe(null)
  })
})

describe('payment method filter cycle', () => {
  it('cycles Any → Stripe → PayPal → Square → Zelle → Any', () => {
    expect(PAYMENT_METHOD_FILTER_OPTIONS).toEqual([
      'stripe',
      'paypal',
      'square',
      'zelle',
    ])
    expect(nextPaymentMethodFilter(null)).toBe('stripe')
    expect(nextPaymentMethodFilter('stripe')).toBe('paypal')
    expect(nextPaymentMethodFilter('paypal')).toBe('square')
    expect(nextPaymentMethodFilter('square')).toBe('zelle')
    expect(nextPaymentMethodFilter('zelle')).toBe(null)
  })
})
