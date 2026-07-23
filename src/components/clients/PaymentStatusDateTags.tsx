import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getLeaseStatusDetails } from '@/lib/clientUtils'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import { resolveLastTransactionPaymentProvider } from '@/lib/paymentProvider'
import {
  buildOfficialPaymentColumnPresentation,
  paymentToneTagClass,
} from '@/lib/paymentStatusPresentation'
import {
  getLastPaymentMadeOn,
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
}

/**
 * Official Tenants payment column: On Time / Overdue / Deposit Paid, with
 * in-tag hover details and a Notify → action to the right when past due.
 */
export function PaymentStatusDateTags({
  client,
  contract,
  className,
}: PaymentStatusDateTagsProps) {
  const schedule = getLeaseRentSchedule(client, contract)
  const leaseUpcoming = getLeaseStatusDetails(client, contract).state === 'Upcoming'
  const column = buildOfficialPaymentColumnPresentation({
    nextDueDate: schedule.nextDueDate,
    daysUntilNextDue: schedule.daysUntilNextDue,
    overduePaymentCount: schedule.overduePaymentCount,
    lastPaidOn: getLastPaymentMadeOn(schedule.payments, client),
    paymentProvider: resolveLastTransactionPaymentProvider(client, contract),
    leaseUpcoming,
  })

  const tagShell = cn(
    'in-place-hover--payment-tag',
    'items-center justify-center text-center',
    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
    'text-[10px] font-bold leading-none tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    paymentToneTagClass(column.tone)
  )

  const tagLayerClass =
    'in-place-hover__payment-label text-center text-[10px] font-bold leading-none tracking-tight'

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
        primary={<span className={tagLayerClass}>{column.tagLabel}</span>}
        secondary={<span className={tagLayerClass}>{column.tagHoverLabel}</span>}
        ariaLabel={column.ariaLabel}
        className={tagShell}
        expandOnReveal
        overlayExpand
        trailing={notify}
      />
    </div>
  )
}
