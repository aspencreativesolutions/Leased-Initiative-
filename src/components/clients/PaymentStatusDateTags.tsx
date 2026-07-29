import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { getLeaseStatusDetails, isDepositInvoicePaid } from '@/lib/clientUtils'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import { resolveLastTransactionPaymentProvider, paymentProviderLabel } from '@/lib/paymentProvider'
import {
  buildOfficialPaymentColumnPresentation,
  paymentToneTagClass,
} from '@/lib/paymentStatusPresentation'
import {
  getLastPaymentMadeOn,
  paymentTenantHref,
  paymentTenantRemindHref,
} from '@/lib/paymentTenantRows'
import { tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import { cn } from '@/lib/utils'
import type { Client, ContractData } from '@/types'

interface PaymentStatusDateTagsProps {
  client: Client
  contract?: ContractData
  className?: string
  onConfirmPayment?: () => void
  confirmingPayment?: boolean
}

/**
 * Official Tenants payment column — always shows status text (no hover swap).
 * Deposit Paid / On Time include the payment method when known.
 */
export function PaymentStatusDateTags({
  client,
  contract,
  className,
  onConfirmPayment,
  confirmingPayment = false,
}: PaymentStatusDateTagsProps) {
  const schedule = getLeaseRentSchedule(client, contract)
  const leaseDetails = getLeaseStatusDetails(client, contract)
  const leaseUpcoming = leaseDetails.state === 'Upcoming'
  const awaitingDeposit =
    Boolean(leaseDetails.awaitingDeposit) ||
    (leaseUpcoming && !isDepositInvoicePaid(client))
  const lastPaidOn = getLastPaymentMadeOn(schedule.payments, client)
  const paymentProvider = resolveLastTransactionPaymentProvider(client, contract)
  const column = buildOfficialPaymentColumnPresentation({
    nextDueDate: schedule.nextDueDate,
    daysUntilNextDue: schedule.daysUntilNextDue,
    overduePaymentCount: schedule.overduePaymentCount,
    lastPaidOn,
    paymentProvider,
    leaseUpcoming,
    awaitingDeposit,
  })

  const canConfirm = column.kind === 'awaiting_deposit' && Boolean(onConfirmPayment)
  const providerLabel = paymentProviderLabel(paymentProvider)

  const displayLabel = (() => {
    if (confirmingPayment && canConfirm) return 'Confirming…'
    if (column.kind === 'deposit_paid') {
      return `Deposit Paid · ${providerLabel}`
    }
    if (column.kind === 'on_time') {
      return `On Time · ${providerLabel}`
    }
    if (column.kind === 'overdue') {
      return column.tagHoverLabel
    }
    if (column.kind === 'awaiting_deposit') {
      return 'Awaiting Deposit'
    }
    return column.tagLabel
  })()

  const paymentsHref =
    column.kind === 'overdue'
      ? paymentTenantRemindHref(client.id)
      : column.kind === 'awaiting_deposit'
        ? undefined
        : lastPaidOn
          ? paymentTenantHref(client.id, 'last')
          : paymentTenantHref(client.id)

  const tagShell = cn(
    'inline-flex max-w-full items-center justify-center gap-0.5 text-center',
    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
    'px-1.5 py-1 text-[10px] font-semibold leading-snug tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    (canConfirm || paymentsHref) && 'cursor-pointer',
    paymentToneTagClass(column.tone)
  )

  const notify =
    column.kind === 'overdue' ? (
      <Link
        to={paymentTenantRemindHref(client.id)}
        className={cn(tableViewLinkSubtleClass, 'payment-status-notify')}
        title={`Notify ${client.name} about overdue payment`}
        aria-label={`Notify ${client.name} about overdue payment`}
      >
        Notify
        <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
      </Link>
    ) : null

  const inner = (
    <>
      {canConfirm ? (
        <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={2.75} aria-hidden />
      ) : null}
      <span className="min-w-0 text-left">{displayLabel}</span>
    </>
  )

  return (
    <div
      className={cn(
        'payment-status-tag-cell inline-flex max-w-full flex-col items-end gap-1',
        className
      )}
      data-hover-cue="payment-status"
    >
      {canConfirm ? (
        <button
          type="button"
          className={tagShell}
          disabled={confirmingPayment}
          aria-label={`${column.ariaLabel} Confirm Payment for ${client.name}.`}
          onClick={() => {
            if (!confirmingPayment) onConfirmPayment?.()
          }}
        >
          {inner}
        </button>
      ) : paymentsHref ? (
        <Link
          to={paymentsHref}
          className={tagShell}
          aria-label={`${column.ariaLabel} Open Payments for ${client.name}.`}
        >
          {inner}
        </Link>
      ) : (
        <span className={tagShell} aria-label={column.ariaLabel}>
          {inner}
        </span>
      )}
      {notify}
    </div>
  )
}
