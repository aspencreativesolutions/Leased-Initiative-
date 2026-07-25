import { formatDaysRemainingLabel } from '@/lib/leaseSchedule'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import { formatLongDate, formatMonthDay } from '@/lib/utils'
import type { Client, PaymentProvider, PortalRentPayment } from '@/types'

/** Mirrors PaymentDisplay in paymentTenantRows (kept local to avoid cycles). */
export type PaymentDisplay = 'Paid' | 'Due' | 'Overdue' | 'Paid Early'

/** Clear landlord-facing payment situations (Official Tenants + Payments). */
export type PaymentSituation =
  | 'current'
  | 'due_soon'
  | 'overdue'
  | 'partially_paid'
  | 'final_payment_due'
  | 'paid_in_full'
  | 'paid_early'

export type PaymentStatusTone = 'positive' | 'neutral' | 'warning' | 'error'

const DUE_SOON_DAYS = 7

const COMPLETED = new Set(['paid', 'paid_early', 'paid_late'])

export interface PaymentStatusPresentation {
  situation: PaymentSituation
  /** Short badge label: Current, Overdue, Paid in Full, … */
  statusLabel: string
  tone: PaymentStatusTone
  /** e.g. "Last payment on time ✓" */
  lastPaymentLabel: string
  /** e.g. "Paid July 1, 2026" — null when nothing to show */
  lastPaymentDateLabel: string | null
  /** True when last rent was on/before due; false when late; null if none */
  lastPaymentOnTime: boolean | null
  /** e.g. "Next payment due: August 1, 2026" / "All payments complete" */
  dueLabel: string
  /** Extra line under due, e.g. "Was due: July 1, 2026" */
  dueDetailLabel: string | null
  /** Compact primary for tight table cells */
  duePrimaryShort: string
  dueSecondaryShort: string | null
}

function latestCompletedPayment(
  payments: PortalRentPayment[]
): PortalRentPayment | null {
  const completed = payments.filter((p) => COMPLETED.has(p.status))
  if (completed.length === 0) return null
  return [...completed].sort((a, b) => {
    const aKey = (a.paidAt ?? a.dueDate).slice(0, 10)
    const bKey = (b.paidAt ?? b.dueDate).slice(0, 10)
    return bKey.localeCompare(aKey)
  })[0]
}

function lastPaymentWasOnTime(payment: PortalRentPayment): boolean {
  if (payment.status === 'paid_late') return false
  if (payment.status === 'paid_early' || payment.status === 'paid') return true
  const paidAt = payment.paidAt?.slice(0, 10)
  const dueDate = payment.dueDate?.slice(0, 10)
  if (paidAt && dueDate) return paidAt <= dueDate
  return true
}

function unpaidCount(payments: PortalRentPayment[]): number {
  return payments.filter((p) => !COMPLETED.has(p.status)).length
}

function buildLastPaymentCopy(
  payments: PortalRentPayment[],
  client?: Client
): {
  label: string
  dateLabel: string | null
  onTime: boolean | null
} {
  const latest = latestCompletedPayment(payments)
  if (latest) {
    const onTime = lastPaymentWasOnTime(latest)
    const paidOn = (latest.paidAt ?? latest.dueDate).slice(0, 10)
    return {
      label: onTime ? 'Last payment on time ✓' : 'Last payment received late',
      dateLabel: `Paid ${formatLongDate(paidOn)}`,
      onTime,
    }
  }

  const depositFallback =
    client?.invoice?.paidAt?.slice(0, 10) ||
    client?.depositPaymentConfirmedAt?.slice(0, 10) ||
    null
  if (depositFallback) {
    return {
      label: 'Last payment on time ✓',
      dateLabel: `Paid ${formatLongDate(depositFallback)}`,
      onTime: true,
    }
  }

  return {
    label: 'No payment received yet',
    dateLabel: null,
    onTime: null,
  }
}

/**
 * Derive a single coherent payment situation from schedule fields.
 * Callers must pass schedule values from getLeaseRentSchedule (same source of truth).
 */
export function resolvePaymentSituation(input: {
  payments: PortalRentPayment[]
  nextDueDate: string | null
  daysUntilNextDue: number | null
  finalDueDate: string | null
  overduePaymentCount: number
  remainingBalance?: number | null
  amountPaidTowardPeriod?: number
  earlyPayment?: PortalRentPayment | null
  asOfYmd?: string
  partiallyPaid?: boolean
}): PaymentSituation {
  const {
    payments,
    nextDueDate,
    daysUntilNextDue,
    finalDueDate,
    overduePaymentCount,
    remainingBalance,
    amountPaidTowardPeriod,
    earlyPayment,
    asOfYmd,
    partiallyPaid,
  } = input

  const hasOverdue =
    overduePaymentCount > 0 || (daysUntilNextDue != null && daysUntilNextDue < 0)

  if (hasOverdue) {
    if (
      partiallyPaid ||
      ((amountPaidTowardPeriod ?? 0) > 0 && (remainingBalance ?? 0) > 0)
    ) {
      return 'partially_paid'
    }
    return 'overdue'
  }

  if (earlyPayment && asOfYmd) {
    const due = earlyPayment.dueDate?.slice(0, 10)
    if (due && due > asOfYmd) return 'paid_early'
  }

  if (payments.length > 0 && unpaidCount(payments) === 0) {
    return 'paid_in_full'
  }

  if (nextDueDate == null) {
    return payments.length > 0 ? 'paid_in_full' : 'current'
  }

  const finalOutstanding =
    Boolean(finalDueDate) &&
    nextDueDate === finalDueDate &&
    !COMPLETED.has(
      payments.find((p) => p.dueDate.slice(0, 10) === finalDueDate)?.status ?? ''
    )

  if (
    finalOutstanding &&
    daysUntilNextDue != null &&
    daysUntilNextDue >= 0 &&
    daysUntilNextDue <= DUE_SOON_DAYS
  ) {
    return 'final_payment_due'
  }

  if (daysUntilNextDue != null && daysUntilNextDue >= 0 && daysUntilNextDue <= DUE_SOON_DAYS) {
    return 'due_soon'
  }

  // Still current (or further out) — final installment uses final-due copy in presentation
  if (finalOutstanding) {
    return 'current'
  }

  return 'current'
}

export function situationStatusLabel(situation: PaymentSituation): string {
  switch (situation) {
    case 'paid_in_full':
      return 'Paid in Full'
    case 'final_payment_due':
      return 'Final Payment Due'
    case 'due_soon':
      return 'Due Soon'
    case 'overdue':
      return 'Overdue'
    case 'partially_paid':
      return 'Partially Paid'
    case 'paid_early':
      return 'Paid Early'
    case 'current':
    default:
      return 'Current'
  }
}

export function situationTone(situation: PaymentSituation): PaymentStatusTone {
  switch (situation) {
    case 'paid_in_full':
    case 'current':
    case 'paid_early':
      return 'positive'
    case 'due_soon':
    case 'final_payment_due':
    case 'partially_paid':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'neutral'
  }
}

/** Map situation → legacy PaymentDisplay used by Payments filters/tiles. */
export function situationToDisplay(situation: PaymentSituation): PaymentDisplay {
  switch (situation) {
    case 'overdue':
    case 'partially_paid':
      return 'Overdue'
    case 'paid_early':
      return 'Paid Early'
    case 'paid_in_full':
    case 'current':
      return 'Paid'
    case 'due_soon':
    case 'final_payment_due':
    default:
      return 'Due'
  }
}

export function buildPaymentStatusPresentation(input: {
  client?: Client
  payments: PortalRentPayment[]
  nextDueDate: string | null
  daysUntilNextDue: number | null
  finalDueDate: string | null
  overduePaymentCount: number
  remainingBalance?: number | null
  amountPaidTowardPeriod?: number
  earlyPayment?: PortalRentPayment | null
  asOfYmd?: string
  partiallyPaid?: boolean
}): PaymentStatusPresentation {
  const situation = resolvePaymentSituation(input)
  const last = buildLastPaymentCopy(input.payments, input.client)
  const statusLabel = situationStatusLabel(situation)
  const tone = situationTone(situation)

  if (situation === 'paid_in_full') {
    return {
      situation,
      statusLabel,
      tone,
      lastPaymentLabel: last.label,
      lastPaymentDateLabel: last.dateLabel,
      lastPaymentOnTime: last.onTime,
      dueLabel: 'All payments complete',
      dueDetailLabel: null,
      duePrimaryShort: 'All payments complete',
      dueSecondaryShort: null,
    }
  }

  if (situation === 'overdue' || situation === 'partially_paid') {
    const daysLate =
      input.daysUntilNextDue != null ? Math.abs(input.daysUntilNextDue) : null
    const overdueLabel =
      daysLate == null
        ? 'Payment overdue'
        : daysLate === 1
          ? 'Payment overdue by 1 day'
          : `Payment overdue by ${daysLate} days`
    const wasDue = input.nextDueDate
      ? `Was due: ${formatLongDate(input.nextDueDate)}`
      : null
    return {
      situation,
      statusLabel,
      tone,
      lastPaymentLabel: last.label,
      lastPaymentDateLabel: last.dateLabel,
      lastPaymentOnTime: last.onTime,
      dueLabel: overdueLabel,
      dueDetailLabel: wasDue,
      duePrimaryShort: overdueLabel,
      dueSecondaryShort: wasDue,
    }
  }

  if (situation === 'final_payment_due' && input.nextDueDate) {
    const date = formatLongDate(input.nextDueDate)
    return {
      situation,
      statusLabel,
      tone,
      lastPaymentLabel: last.label,
      lastPaymentDateLabel: last.dateLabel,
      lastPaymentOnTime: last.onTime,
      dueLabel: `Final payment due: ${date}`,
      dueDetailLabel: null,
      duePrimaryShort: 'Final payment due',
      dueSecondaryShort: date,
    }
  }

  // Current / due soon / paid early — still label the last installment as final when applicable
  if (
    input.nextDueDate &&
    input.finalDueDate &&
    input.nextDueDate === input.finalDueDate
  ) {
    const date = formatLongDate(input.nextDueDate)
    const countdown =
      input.daysUntilNextDue != null
        ? formatDaysRemainingLabel(input.daysUntilNextDue)
        : null
    return {
      situation,
      statusLabel,
      tone,
      lastPaymentLabel: last.label,
      lastPaymentDateLabel: last.dateLabel,
      lastPaymentOnTime: last.onTime,
      dueLabel: `Final payment due: ${date}`,
      dueDetailLabel: countdown,
      duePrimaryShort: 'Final payment due',
      dueSecondaryShort: date,
    }
  }

  if (input.nextDueDate) {
    const date = formatLongDate(input.nextDueDate)
    const countdown =
      input.daysUntilNextDue != null
        ? formatDaysRemainingLabel(input.daysUntilNextDue)
        : null
    return {
      situation,
      statusLabel,
      tone,
      lastPaymentLabel: last.label,
      lastPaymentDateLabel: last.dateLabel,
      lastPaymentOnTime: last.onTime,
      dueLabel: `Next payment due: ${date}`,
      dueDetailLabel: countdown,
      duePrimaryShort: 'Next payment due',
      dueSecondaryShort: date,
    }
  }

  return {
    situation,
    statusLabel,
    tone,
    lastPaymentLabel: last.label,
    lastPaymentDateLabel: last.dateLabel,
    lastPaymentOnTime: last.onTime,
    dueLabel: 'All payments complete',
    dueDetailLabel: null,
    duePrimaryShort: 'All payments complete',
    dueSecondaryShort: null,
  }
}

/** Class fragments for Official Tenants payment tags. */
export function paymentToneTagClass(tone: PaymentStatusTone): string {
  switch (tone) {
    case 'positive':
      return 'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]'
    case 'warning':
      return 'border-ink/20 bg-surface text-ink'
    case 'error':
      return 'border-accent/40 bg-accent-light text-accent'
    case 'neutral':
    default:
      // Deposit Paid (Upcoming leases) — matches StatusBadge payment Deposit Paid.
      return 'border-ink-muted bg-surface text-ink'
  }
}

/** Status kinds for Official Tenants Payment Status column. */
export type OfficialPaymentColumnKind =
  | 'on_time'
  | 'overdue'
  | 'deposit_paid'
  | 'awaiting_deposit'

export interface OfficialPaymentColumnPresentation {
  kind: OfficialPaymentColumnKind
  /** Primary tag: On Time | Overdue | Deposit Paid | Awaiting Deposit */
  tagLabel: string
  /** In-tag hover/focus replacement */
  tagHoverLabel: string
  tone: PaymentStatusTone
  ariaLabel: string
  daysUntilNextDue: number | null
  daysOverdue: number | null
  /** Next unpaid due (oldest overdue when past due) */
  relevantDueDate: string | null
}

function formatDaysLateLabel(daysLate: number): string {
  return daysLate === 1 ? '1 day late' : `${daysLate} days late`
}

/**
 * Official Tenants grid payment labels:
 * - Overdue when scheduled rent is past due
 * - Awaiting Deposit when the lease has not started and deposit is unpaid
 * - Deposit Paid when the lease has not started yet and deposit is confirmed
 * - On Time otherwise
 *
 * On Time / Deposit Paid hover confirms the last payment date and processor
 * (Stripe / PayPal / Square). Does not treat remaining lease balance alone as overdue.
 */
export function buildOfficialPaymentColumnPresentation(input: {
  nextDueDate: string | null
  daysUntilNextDue: number | null
  overduePaymentCount: number
  /** Most recent rent (or deposit) received date */
  lastPaidOn?: string | null
  /** Processor used for that last payment */
  paymentProvider?: PaymentProvider
  /** When true, lease has not started yet (calendar Upcoming). */
  leaseUpcoming?: boolean
  /** When true with leaseUpcoming, show Awaiting Deposit instead of Deposit Paid. */
  awaitingDeposit?: boolean
}): OfficialPaymentColumnPresentation {
  const { nextDueDate, daysUntilNextDue, overduePaymentCount } = input

  const isOverdue =
    overduePaymentCount > 0 || (daysUntilNextDue != null && daysUntilNextDue < 0)

  if (isOverdue) {
    const daysLate =
      daysUntilNextDue != null && daysUntilNextDue < 0
        ? Math.abs(daysUntilNextDue)
        : null
    const monthDay = nextDueDate ? formatMonthDay(nextDueDate) : null
    const tagHoverLabel =
      daysLate != null && monthDay
        ? `${formatDaysLateLabel(daysLate)} · Due ${monthDay}`
        : daysLate != null
          ? formatDaysLateLabel(daysLate)
          : monthDay
            ? `Due ${monthDay}`
            : 'Past due'
    const longDue = nextDueDate ? formatLongDate(nextDueDate) : null
    const ariaLabel =
      daysLate != null && longDue
        ? `Payment overdue by ${daysLate} ${daysLate === 1 ? 'day' : 'days'}. Payment was due ${longDue}.`
        : daysLate != null
          ? `Payment overdue by ${daysLate} ${daysLate === 1 ? 'day' : 'days'}.`
          : longDue
            ? `Payment overdue. Payment was due ${longDue}.`
            : 'Payment overdue.'

    return {
      kind: 'overdue',
      tagLabel: 'Overdue',
      tagHoverLabel,
      tone: 'error',
      ariaLabel,
      daysUntilNextDue,
      daysOverdue: daysLate,
      relevantDueDate: nextDueDate,
    }
  }

  const providerLabel = paymentProviderLabel(input.paymentProvider)
  const paidMonthDay = input.lastPaidOn ? formatMonthDay(input.lastPaidOn) : null
  const longPaid = input.lastPaidOn ? formatLongDate(input.lastPaidOn) : null
  const longDue = nextDueDate ? formatLongDate(nextDueDate) : null

  if (input.leaseUpcoming && input.awaitingDeposit) {
    return {
      kind: 'awaiting_deposit',
      tagLabel: 'Awaiting Deposit',
      tagHoverLabel: 'Confirm Payment',
      tone: 'warning',
      ariaLabel: longDue
        ? `Awaiting deposit. Confirm payment when received. Lease begins ${longDue}.`
        : 'Awaiting deposit. Confirm payment when received.',
      daysUntilNextDue,
      daysOverdue: null,
      relevantDueDate: nextDueDate,
    }
  }

  if (input.leaseUpcoming) {
    const tagHoverLabel = paidMonthDay
      ? `Paid ${paidMonthDay} · ${providerLabel}`
      : 'Deposit received'
    const ariaLabel = longPaid
      ? longDue
        ? `Deposit paid. Last paid ${longPaid} via ${providerLabel}. Lease begins ${longDue}.`
        : `Deposit paid. Last paid ${longPaid} via ${providerLabel}.`
      : longDue
        ? `Deposit paid. Lease begins ${longDue}.`
        : 'Deposit paid.'

    return {
      kind: 'deposit_paid',
      tagLabel: 'Deposit Paid',
      tagHoverLabel,
      tone: 'neutral',
      ariaLabel,
      daysUntilNextDue,
      daysOverdue: null,
      relevantDueDate: nextDueDate,
    }
  }

  const tagHoverLabel = paidMonthDay
    ? `Paid ${paidMonthDay} · ${providerLabel}`
    : 'Paid in full'
  const ariaLabel = longPaid
    ? longDue
      ? `Payment on time. Last paid ${longPaid} via ${providerLabel}. Next payment due ${longDue}.`
      : `Payment on time. Last paid ${longPaid} via ${providerLabel}. All payments complete.`
    : longDue
      ? `Payment on time. Next payment due ${longDue}.`
      : 'Payment on time. All payments complete.'

  return {
    kind: 'on_time',
    tagLabel: 'On Time',
    tagHoverLabel,
    tone: 'positive',
    ariaLabel,
    daysUntilNextDue,
    daysOverdue: null,
    relevantDueDate: nextDueDate,
  }
}
