import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { isTopServiceTier } from '@/lib/serviceTiers'
import { cn, formatDate, type DeadlineUrgency } from '@/lib/utils'
import {
  formatDeadlineTime,
  formatProximityLabel,
  getDeadlineDescription,
  isMeetingDeadline,
} from '@/lib/deadlineDetails'
import type { Deadline, ServiceTier } from '@/types'

export interface DeadlineGalleryItem {
  id: string
  clientId: string
  clientName: string
  projectName: string
  serviceTier: ServiceTier
  deadline: Deadline
  urgency: DeadlineUrgency
}

const urgencyIcon = {
  overdue: AlertCircle,
  'due-soon': Clock,
  upcoming: CalendarClock,
  completed: CheckCircle2,
}

const urgencyStyle = {
  overdue: 'border-accent bg-accent-light/40',
  'due-soon': 'border-ink/30 bg-ink/5',
  upcoming: 'border-line bg-surface-paper',
  completed: 'border-line bg-transparent',
}

const typeLabels: Record<Deadline['type'], string> = {
  'follow-up': 'Follow-up',
  project: 'Project',
  contract: 'Contract',
  payment: 'Payment',
}

interface DeadlineGalleryCardProps {
  item: DeadlineGalleryItem
}

export function DeadlineGalleryCard({ item }: DeadlineGalleryCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { deadline, urgency, serviceTier } = item
  const Icon = urgencyIcon[urgency]
  const isSummit = isTopServiceTier(serviceTier)
  const proximity = formatProximityLabel(deadline)
  const showMeeting = isMeetingDeadline(deadline)
  const timeLabel = formatDeadlineTime(deadline.time)
  const dateLine = `${formatDate(deadline.date)}${timeLabel ? ` · ${timeLabel}` : ''}`

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[var(--radius-sm)] border-2 transition-shadow',
        urgencyStyle[urgency],
        detailsOpen && 'shadow-lift'
      )}
    >
      <div className="flex items-start gap-2 p-2.5 sm:gap-3 sm:p-3">
        <Icon
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0 text-ink sm:h-4 sm:w-4',
            urgency === 'overdue' && 'text-accent'
          )}
          strokeWidth={2.25}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'min-w-0 truncate text-xs leading-snug text-ink sm:text-sm',
                isSummit ? 'font-extrabold' : 'font-semibold'
              )}
            >
              {deadline.label}
            </p>
            <ServiceTierBadge tier={serviceTier} tiny className="hidden shrink-0 sm:inline-flex" />
          </div>

          <p
            className={cn(
              'truncate text-[10px] leading-snug text-ink-muted sm:text-xs',
              isSummit && 'font-bold text-ink'
            )}
          >
            {item.clientName} · {item.projectName}
          </p>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] font-bold uppercase tracking-caps sm:gap-x-2 sm:text-[10px]">
            {deadline.type === 'payment' ? (
              <Link
                to={`/studio/clients/${item.clientId}#deposit-invoice`}
                className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line px-1.5 py-px text-ink-faint transition-colors hover:border-brand hover:text-brand"
                title="View invoice on client profile"
              >
                {typeLabels[deadline.type]}
              </Link>
            ) : (
              <span className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line px-1.5 py-px text-ink-faint">
                {typeLabels[deadline.type]}
              </span>
            )}
            {proximity && (
              <span className={urgency === 'overdue' ? 'text-accent' : 'text-ink-muted'}>
                {proximity}
              </span>
            )}
            <span className="hidden min-w-0 truncate text-ink sm:inline">{dateLine}</span>
          </div>

          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink sm:hidden">
            {dateLine}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <ServiceTierBadge tier={serviceTier} tiny className="sm:hidden" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[10px]"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? 'Hide' : 'Details'}
          </Button>
        </div>
      </div>

      {detailsOpen && (
        <div className="border-t border-line/80 bg-surface/40 px-2.5 py-2.5 sm:px-3 sm:py-3">
          <dl className="space-y-2 text-sm sm:space-y-2.5">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                What to expect
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted sm:text-sm">
                {getDeadlineDescription(deadline)}
              </dd>
            </div>

            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                Date & time
              </dt>
              <dd className="mt-0.5 text-xs font-medium text-ink sm:text-sm">
                {formatDate(deadline.date)}
                {timeLabel ? ` at ${timeLabel}` : ' (time TBD)'}
              </dd>
            </div>

            {showMeeting && deadline.meetingLink && (
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Meeting link
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={deadline.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline sm:text-sm"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join meeting
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}

            {showMeeting && !deadline.meetingLink && (
              <p className="text-xs text-ink-muted">
                Your designer will send a meeting link before this call.
              </p>
            )}

            {deadline.notes?.trim() && (
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Notes
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-xs text-ink-muted sm:text-sm">
                  {deadline.notes}
                </dd>
              </div>
            )}
          </dl>

          <Link
            to={`/studio/clients/${item.clientId}`}
            className="mt-2 inline-flex text-[11px] font-semibold text-brand hover:underline sm:text-xs"
          >
            View client profile
          </Link>
        </div>
      )}
    </article>
  )
}
