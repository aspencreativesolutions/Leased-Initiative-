import { cn } from '@/lib/utils'
import type { LeaseStatusDetails, LeaseTimelineState } from '@/lib/clientUtils'

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

  if (!state) {
    return (
      <span
        className={cn(
          'inline-block max-w-full text-xs font-medium leading-snug text-ink',
          className
        )}
        title={label}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'lease-status-badge inline-flex max-w-full items-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-tight',
        stateStyles[state],
        className
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
