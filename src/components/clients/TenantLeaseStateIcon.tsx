import { Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaseStatusDetails } from '@/lib/clientUtils'

/**
 * Occupancy-state glyph beside an Official Tenant name:
 * check = Active, clock = Upcoming / Awaiting Deposit.
 */
export function TenantLeaseStateIcon({
  details,
  className,
}: {
  details: LeaseStatusDetails
  className?: string
}) {
  const isActive =
    details.state === 'Active' || details.state === 'Ending Soon'
  const isUpcoming =
    details.awaitingDeposit ||
    details.state === 'Upcoming' ||
    details.state === 'Expired'

  if (!isActive && !isUpcoming) return null

  const Icon = isActive ? Check : Clock
  const label = isActive
    ? 'Active lease'
    : details.awaitingDeposit
      ? 'Awaiting deposit'
      : details.state === 'Expired'
        ? 'Expired lease'
        : 'Upcoming lease'

  return (
    <span
      className={cn(
        'inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center self-center text-ink-muted',
        isActive && 'text-[color:var(--deposit-fg)]',
        details.awaitingDeposit && 'text-accent',
        className
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-[0.85em] w-[0.85em]" strokeWidth={2.75} aria-hidden />
    </span>
  )
}
