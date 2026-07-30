import type { PaymentDisplay } from '@/lib/paymentTenantRows'
import type { PaymentProvider } from '@/types'

/** Payment status cycle in Display Settings → Filter (after Any). */
export const PAYMENT_STATUS_FILTERS = [
  'paid',
  'overdue',
  'paid_early',
  'on_time',
] as const

export type PaymentStatusFilter = (typeof PAYMENT_STATUS_FILTERS)[number]

export const PAYMENT_STATUS_FILTER_CYCLE = [
  null,
  ...PAYMENT_STATUS_FILTERS,
] as const satisfies ReadonlyArray<PaymentStatusFilter | null>

export const PAYMENT_STATUS_FILTER_BUTTON_WIDTH_CLASS = 'w-[8.5rem]'

export function getPaymentStatusFilterLabel(
  filter: PaymentStatusFilter | null
): string {
  switch (filter) {
    case 'paid':
      return 'Paid Rent'
    case 'overdue':
      return 'Overdue Rent'
    case 'paid_early':
      return 'Paid Early'
    case 'on_time':
      return 'On Time'
    default:
      return 'Any'
  }
}

export function nextPaymentStatusFilter(
  current: PaymentStatusFilter | null
): PaymentStatusFilter | null {
  const cycle = PAYMENT_STATUS_FILTER_CYCLE
  const idx = cycle.findIndex((entry) => entry === current)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % cycle.length
  return cycle[nextIdx] ?? null
}

/** Map cycle filter → row `display` used by Payments tiles/table. */
export function paymentStatusFilterMatchesDisplay(
  filter: PaymentStatusFilter,
  display: PaymentDisplay
): boolean {
  switch (filter) {
    case 'paid':
      return display === 'Paid'
    case 'overdue':
      return display === 'Overdue'
    case 'paid_early':
      return display === 'Paid Early'
    case 'on_time':
      return display === 'Due'
    default:
      return true
  }
}

/** URL / deep-link status values still supported on Payments. */
export function parsePaymentStatusQuery(
  value: string | null
): PaymentStatusFilter | null {
  if (value === 'overdue') return 'overdue'
  if (value === 'paid_early') return 'paid_early'
  if (value === 'paid') return 'paid'
  if (value === 'on_time' || value === 'due') return 'on_time'
  return null
}

export function paymentStatusFilterToQuery(
  filter: PaymentStatusFilter | null
): string | null {
  return filter
}

export const PAYMENT_METHOD_FILTER_OPTIONS: readonly PaymentProvider[] = [
  'stripe',
  'paypal',
  'square',
  'zelle',
]

export const PAYMENT_METHOD_FILTER_CYCLE = [
  null,
  ...PAYMENT_METHOD_FILTER_OPTIONS,
] as const satisfies ReadonlyArray<PaymentProvider | null>

export const PAYMENT_METHOD_FILTER_BUTTON_WIDTH_CLASS = 'w-[7.5rem]'

export function nextPaymentMethodFilter(
  current: PaymentProvider | null
): PaymentProvider | null {
  const cycle = PAYMENT_METHOD_FILTER_CYCLE
  const idx = cycle.findIndex((entry) => entry === current)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % cycle.length
  return cycle[nextIdx] ?? null
}
