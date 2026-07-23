import { CalendarClock, Check } from 'lucide-react'
import {
  formatDaysRemainingLabel,
  formatLeaseLengthLabel,
} from '@/lib/leaseSchedule'
import { cn, formatDate } from '@/lib/utils'
import type { PortalLeaseSchedule, PortalRentPaymentStatus } from '@/types'

const STATUS_LABEL: Record<PortalRentPaymentStatus, string> = {
  paid: 'Paid',
  paid_early: 'Paid Early',
  paid_late: 'Paid Late',
  due: 'Due now',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
}

function isCompletedStatus(status: PortalRentPaymentStatus): boolean {
  return status === 'paid' || status === 'paid_early' || status === 'paid_late'
}

interface PortalPaymentScheduleTimelineProps {
  schedule: PortalLeaseSchedule | null | undefined
  className?: string
}

export function PortalPaymentScheduleTimeline({
  schedule,
  className,
}: PortalPaymentScheduleTimelineProps) {
  if (!schedule || schedule.payments.length === 0) {
    return (
      <section
        className={cn('mb-8', className)}
        data-onboarding="portal-payment-schedule"
        aria-labelledby="payment-schedule-heading"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="payment-schedule-heading" className="label-caps flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Payment Schedule
          </h2>
        </div>
        <div className="rounded-[var(--radius-sm)] border-2 border-dashed border-ink/20 bg-surface-paper px-4 py-6 text-center">
          <p className="text-sm text-ink-muted">
            Your rent payment timeline will appear here once your lease dates are set.
          </p>
        </div>
      </section>
    )
  }

  const termLabel =
    schedule.leaseLengthMonths != null
      ? formatLeaseLengthLabel(schedule.leaseLengthMonths)
      : `${schedule.payments.length}-month lease`

  const earlyEvents = schedule.payments.filter(
    (p) => p.status === 'paid_early' && (p.eventLabel || p.paidAt)
  )

  return (
    <section
      className={cn('mb-8', className)}
      data-onboarding="portal-payment-schedule"
      aria-labelledby="payment-schedule-heading"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="payment-schedule-heading" className="label-caps flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Payment Schedule
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {termLabel}
            {schedule.leaseStartDate && schedule.leaseEndDate
              ? ` · ${formatDate(schedule.leaseStartDate)} – ${formatDate(schedule.leaseEndDate)}`
              : null}
          </p>
        </div>
        {schedule.nextDueDate && schedule.daysUntilNextDue != null && (
          <p className="text-xs font-semibold text-ink">
            {schedule.daysUntilNextDue < 0
              ? `Payment overdue by ${Math.abs(schedule.daysUntilNextDue)} day${
                  Math.abs(schedule.daysUntilNextDue) === 1 ? '' : 's'
                } · Was due ${formatDate(schedule.nextDueDate)}`
              : `Next payment due: ${formatDate(schedule.nextDueDate)} · ${formatDaysRemainingLabel(
                  schedule.daysUntilNextDue
                )}`}
          </p>
        )}
        {!schedule.nextDueDate && schedule.payments.length > 0 && (
          <p className="text-xs font-semibold text-ink">All payments complete</p>
        )}
      </div>

      <ol
        className={cn(
          'flex gap-2 overflow-x-auto pb-1',
          schedule.payments.length <= 6
            ? 'sm:grid sm:grid-cols-6 sm:overflow-visible'
            : 'sm:grid sm:grid-cols-6 sm:overflow-visible lg:grid-cols-12'
        )}
        aria-label={`${termLabel} rent payment timeline`}
      >
        {schedule.payments.map((payment, index) => {
          const isActive = payment.status === 'due' || payment.status === 'overdue'
          const isPaid = isCompletedStatus(payment.status)
          const isEarly = payment.status === 'paid_early'
          const isLate = payment.status === 'paid_late'

          return (
            <li
              key={payment.dueDate}
              className="flex min-w-[4.5rem] flex-1 flex-col items-center sm:min-w-0"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold',
                  isPaid && !isEarly && !isLate && 'border-brand bg-brand text-white',
                  isEarly && 'border-brand bg-brand/15 text-brand',
                  isLate && 'border-accent bg-accent/15 text-accent',
                  isActive &&
                    !isPaid &&
                    'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light)]',
                  !isPaid &&
                    !isActive &&
                    'border-line bg-surface-paper text-ink-faint'
                )}
                title={
                  payment.eventLabel ||
                  (payment.paidAt
                    ? `${STATUS_LABEL[payment.status]} · ${formatDate(payment.paidAt)}`
                    : STATUS_LABEL[payment.status])
                }
              >
                {isPaid ? (
                  <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                ) : (
                  index + 1
                )}
              </div>
              <p className="mt-1.5 text-center text-[10px] font-semibold leading-tight text-ink">
                {formatDate(payment.dueDate)}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-center text-[9px] uppercase tracking-caps',
                  payment.status === 'overdue' && 'font-bold text-accent',
                  payment.status === 'due' && 'font-bold text-accent',
                  payment.status === 'paid' && 'text-brand',
                  payment.status === 'paid_early' && 'font-bold text-brand',
                  payment.status === 'paid_late' && 'font-semibold text-accent',
                  payment.status === 'upcoming' && 'text-ink-faint'
                )}
              >
                {STATUS_LABEL[payment.status]}
              </p>
            </li>
          )
        })}
      </ol>

      {earlyEvents.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-left" aria-label="Early payment notices">
          {earlyEvents.map((payment) => (
            <li
              key={`early-${payment.dueDate}`}
              className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-3 py-2 text-sm text-ink"
            >
              <span className="inline-flex items-center rounded-sm border border-brand bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-caps text-brand">
                Paid Early
              </span>
              <span>
                {payment.eventLabel ||
                  `${formatDate(payment.dueDate)} rent paid early${
                    payment.paidAt ? ` on ${formatDate(payment.paidAt)}` : ''
                  }`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
