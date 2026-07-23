import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
 * Official Tenants payment column: On Time / Overdue only, with in-tag
 * hover details and a Notify → action when past due.
 */
export function PaymentStatusDateTags({
  client,
  contract,
  className,
}: PaymentStatusDateTagsProps) {
  const schedule = getLeaseRentSchedule(client, contract)
  const column = buildOfficialPaymentColumnPresentation({
    nextDueDate: schedule.nextDueDate,
    daysUntilNextDue: schedule.daysUntilNextDue,
    overduePaymentCount: schedule.overduePaymentCount,
    lastPaidOn: getLastPaymentMadeOn(schedule.payments, client),
    paymentProvider: resolveLastTransactionPaymentProvider(client, contract),
  })

  const tagShell = cn(
    'in-place-hover--payment-tag',
    'items-center justify-center justify-items-center text-center',
    'rounded-[var(--radius-sm)] border',
    'text-[10px] font-bold tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    paymentToneTagClass(column.tone)
  )

  // Shared layer type so Overdue / On Time expand with identical typography.
  const tagLayerClass =
    'in-place-hover__payment-label text-center text-[10px] font-bold tracking-tight whitespace-nowrap'

  return (
    <div
      className={cn(
        // Reserves expand-host width (longest hover label) so hover never
        // shifts columns, row height, or the Notify action beneath the tag.
        'payment-status-tag-cell mx-auto flex flex-col items-center gap-1 overflow-visible',
        className
      )}
    >
      <InPlaceHoverText
        primary={<span className={tagLayerClass}>{column.tagLabel}</span>}
        secondary={<span className={tagLayerClass}>{column.tagHoverLabel}</span>}
        ariaLabel={column.ariaLabel}
        className={tagShell}
        expandOnReveal
      />

      {column.kind === 'overdue' ? (
        <Link
          to={paymentTenantRemindHref(client.id)}
          className={tableViewLinkSubtleClass}
          title={`Notify ${client.name} about overdue payment`}
          aria-label={`Notify ${client.name} about overdue payment`}
        >
          Notify
          <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
        </Link>
      ) : (
        <p className="text-center text-[10px] leading-snug text-ink-muted tabular-nums">
          {column.nextPaymentSubline}
        </p>
      )}
    </div>
  )
}
