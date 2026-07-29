import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { getLeaseStatusDetails, isDepositInvoicePaid } from '@/lib/clientUtils'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import { resolveLastTransactionPaymentProvider } from '@/lib/paymentProvider'
import {
  buildOfficialPaymentColumnPresentation,
  paymentToneTagClass,
} from '@/lib/paymentStatusPresentation'
import {
  getLastPaymentMadeOn,
  paymentTenantHref,
  paymentTenantRemindHref,
} from '@/lib/paymentTenantRows'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
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
 * Official Tenants payment column: On Time / Overdue / Deposit Paid /
 * Awaiting Deposit, with in-tag hover details (fixed-size shell; hover text
 * is not bold). Awaiting Deposit hover confirms payment; Overdue shows
 * Notify → to the right.
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
  const awaitingDeposit = Boolean(leaseDetails.awaitingDeposit) || (
    leaseUpcoming && !isDepositInvoicePaid(client)
  )
  const lastPaidOn = getLastPaymentMadeOn(schedule.payments, client)
  const column = buildOfficialPaymentColumnPresentation({
    nextDueDate: schedule.nextDueDate,
    daysUntilNextDue: schedule.daysUntilNextDue,
    overduePaymentCount: schedule.overduePaymentCount,
    lastPaidOn,
    paymentProvider: resolveLastTransactionPaymentProvider(client, contract),
    leaseUpcoming,
    awaitingDeposit,
  })

  const canConfirm = column.kind === 'awaiting_deposit' && Boolean(onConfirmPayment)

  const paymentsHref =
    column.kind === 'overdue'
      ? paymentTenantRemindHref(client.id)
      : column.kind === 'awaiting_deposit'
        ? undefined
        : lastPaidOn
          ? paymentTenantHref(client.id, 'last')
          : paymentTenantHref(client.id)

  const tagShell = cn(
    'in-place-hover--payment-tag',
    'items-center justify-center text-center',
    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
    'text-[10px] leading-none tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    paymentToneTagClass(column.tone)
  )

  const tagPrimaryLabelClass =
    'in-place-hover__payment-label text-center text-[10px] font-bold leading-none tracking-tight'
  const tagHoverLabelClass =
    'in-place-hover__payment-label text-center text-[10px] font-normal leading-none tracking-tight'

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

  return (
    <div className={cn('payment-status-tag-cell', className)}>
      <InPlaceHoverText
        primary={<span className={tagPrimaryLabelClass}>{column.tagLabel}</span>}
        secondary={
          <span className={tagHoverLabelClass}>
            {canConfirm ? (
              <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={2.75} aria-hidden />
            ) : null}
            {confirmingPayment && canConfirm ? 'Confirming…' : column.tagHoverLabel}
          </span>
        }
        ariaLabel={
          canConfirm
            ? `${column.ariaLabel} Confirm Payment for ${client.name}.`
            : `${column.ariaLabel}${paymentsHref ? ` Open Payments for ${client.name}.` : ''}`
        }
        to={canConfirm ? undefined : paymentsHref}
        onActivate={
          canConfirm
            ? () => {
                if (!confirmingPayment) onConfirmPayment?.()
              }
            : undefined
        }
        className={tagShell}
        expandOnReveal
        overlayExpand
        trailing={notify}
        disabled={confirmingPayment && canConfirm}
      />
    </div>
  )
}
