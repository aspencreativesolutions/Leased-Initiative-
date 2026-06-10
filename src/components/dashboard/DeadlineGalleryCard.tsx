import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Video,
} from 'lucide-react'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
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
  const [expanded, setExpanded] = useState(false)
  const { deadline, urgency, serviceTier } = item
  const Icon = urgencyIcon[urgency]
  const isPremium = serviceTier === 'Premium Custom'
  const proximity = formatProximityLabel(deadline)
  const showMeeting = isMeetingDeadline(deadline)
  const timeLabel = formatDeadlineTime(deadline.time)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-[var(--radius-sm)] border-2 transition-shadow',
        urgencyStyle[urgency],
        expanded && 'shadow-lift'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-surface/60"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className={cn('rounded-sm border-2 p-2', urgencyStyle[urgency])}>
            <Icon className="h-4 w-4 text-ink" strokeWidth={2.25} />
          </div>
          <div className="flex items-center gap-2">
            <ServiceTierBadge tier={serviceTier} small />
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-ink-muted transition-transform',
                expanded && 'rotate-180'
              )}
            />
          </div>
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              'text-sm text-ink',
              isPremium ? 'font-extrabold' : 'font-semibold'
            )}
          >
            {deadline.label}
          </p>
          <p
            className={cn(
              'mt-0.5 truncate text-xs text-ink-muted',
              isPremium && 'font-bold text-ink'
            )}
          >
            {item.clientName} · {item.projectName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-line px-2 py-0.5 text-[9px] font-bold uppercase tracking-caps text-ink-faint">
            {typeLabels[deadline.type]}
          </span>
          {proximity && (
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-caps',
                urgency === 'overdue' ? 'text-accent' : 'text-ink-muted'
              )}
            >
              {proximity}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-caps text-ink">
          {formatDate(deadline.date)}
          {timeLabel ? ` · ${timeLabel}` : ''}
        </p>
      </button>

      {expanded && (
        <div className="border-t border-line/80 bg-surface/40 px-4 py-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                Date & time
              </dt>
              <dd className="mt-1 font-medium text-ink">
                {formatDate(deadline.date)}
                {timeLabel ? ` at ${timeLabel}` : ' (time TBD)'}
              </dd>
            </div>

            {showMeeting && deadline.meetingLink && (
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Meeting link
                </dt>
                <dd className="mt-1">
                  <a
                    href={deadline.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                    onClick={(e) => e.stopPropagation()}
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

            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                What to expect
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink-muted">
                {getDeadlineDescription(deadline)}
              </dd>
            </div>

            {deadline.notes?.trim() && (
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink-muted">{deadline.notes}</dd>
              </div>
            )}
          </dl>

          <Link
            to={`/clients/${item.clientId}`}
            className="mt-4 inline-flex text-xs font-semibold text-brand hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View client profile
          </Link>
        </div>
      )}
    </article>
  )
}
