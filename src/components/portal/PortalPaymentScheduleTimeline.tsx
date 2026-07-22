import { CalendarClock, Check } from 'lucide-react'
import {
  formatDaysRemainingLabel,
  formatLeaseLengthLabel,
} from '@/lib/leaseSchedule'
import { cn, formatDate } from '@/lib/utils'
import type { PortalLeaseSchedule, PortalRentPaymentStatus } from '@/types'

const STATUS_LABEL: Record<PortalRentPaymentStatus, string> = {
  paid: 'Paid',
  due: 'Due now',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
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
            Next: {formatDate(schedule.nextDueDate)} ·{' '}
            {formatDaysRemainingLabel(schedule.daysUntilNextDue)}
          </p>
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
          const isPaid = payment.status === 'paid'

          return (
            <li
              key={payment.dueDate}
              className="flex min-w-[4.5rem] flex-1 flex-col items-center sm:min-w-0"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold',
                  isPaid && 'border-brand bg-brand text-white',
                  isActive &&
                    !isPaid &&
                    'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light)]',
                  !isPaid &&
                    !isActive &&
                    'border-line bg-surface-paper text-ink-faint'
                )}
                title={STATUS_LABEL[payment.status]}
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
                  payment.status === 'upcoming' && 'text-ink-faint'
                )}
              >
                {STATUS_LABEL[payment.status]}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
