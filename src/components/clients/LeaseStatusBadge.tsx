import { cn } from '@/lib/utils'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
import {
  getLeaseStatusHoverDetail,
  type LeaseStatusDetails,
  type LeaseTimelineState,
} from '@/lib/clientUtils'

const stateStyles: Record<LeaseTimelineState, string> = {
  Active:
    'lease-status-badge--active border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
  'Ending Soon':
    'lease-status-badge--ending-soon border-accent/40 bg-accent-light text-accent',
  Upcoming: 'border-ink/15 bg-surface text-ink-muted',
  Expired: 'border-line bg-transparent text-ink-faint',
}

interface LeaseStatusBadgeProps {
  details: LeaseStatusDetails
  className?: string
}

/** Compact lease timeline badge for Official Tenants (and mobile cards). */
export function LeaseStatusBadge({ details, className }: LeaseStatusBadgeProps) {
  const state = details.state
  const label = details.status
  const hoverDetail = getLeaseStatusHoverDetail(details)
  const isProgressTag =
    (state === 'Active' || state === 'Ending Soon') &&
    details.currentMonth != null &&
    details.termMonths != null

  if (!state) {
    return (
      <span
        className={cn(
          'inline-block max-w-full text-xs font-medium leading-snug text-ink',
          className
        )}
      >
        {label}
      </span>
    )
  }

  const shellClass = cn(
    'lease-status-badge inline-flex max-w-full items-center justify-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-center text-[10px] font-bold leading-none tracking-tight',
    isProgressTag && 'lease-status-badge--progress',
    hoverDetail && 'lease-status-badge--hoverable cursor-default',
    stateStyles[state],
    className
  )

  if (!hoverDetail) {
    return (
      <span className={shellClass}>
        <span className={cn(isProgressTag ? 'whitespace-nowrap' : 'truncate')}>{label}</span>
      </span>
    )
  }

  return (
    <InPlaceHoverText
      primary={
        <span className={cn(isProgressTag ? 'whitespace-nowrap' : 'truncate')}>{label}</span>
      }
      secondary={
        <span
          className={cn(
            'truncate tabular-nums',
            isProgressTag ? 'text-[9px]' : undefined
          )}
        >
          {hoverDetail}
        </span>
      }
      ariaLabel={`${label}. ${hoverDetail}`}
      className={cn(
        shellClass,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface'
      )}
    />
  )
}
