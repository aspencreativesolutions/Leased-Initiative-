import { useEffect, useId, useRef, useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatLeaseStatusHoverDate,
  type LeaseStatusDetails,
} from '@/lib/clientUtils'

/**
 * Occupancy-state glyph beside an Official Tenant name:
 * check = Active, clock = Upcoming / Awaiting Deposit.
 * Click (or keyboard) clarifies the status — titles alone are easy to miss on mobile.
 */
export function TenantLeaseStateIcon({
  details,
  className,
}: {
  details: LeaseStatusDetails
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelId = useId()

  const isActive =
    details.state === 'Active' || details.state === 'Ending Soon'
  const isUpcoming =
    details.awaitingDeposit ||
    details.state === 'Upcoming' ||
    details.state === 'Expired'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!isActive && !isUpcoming) return null

  const Icon = isActive ? Check : Clock
  const startLabel = formatLeaseStatusHoverDate(details.startDate)
  const endLabel = formatLeaseStatusHoverDate(details.endDate)

  let title: string
  let body: string
  if (isActive && details.state === 'Ending Soon') {
    title = 'Ending soon'
    body = endLabel
      ? `Lease is active and ending soon (${endLabel}).`
      : 'Lease is active and ending soon.'
  } else if (isActive) {
    title = 'Active'
    body = startLabel
      ? `Lease is active (started ${startLabel}).`
      : 'Lease is currently active.'
  } else if (details.awaitingDeposit) {
    title = 'Awaiting deposit'
    body = startLabel
      ? `Upcoming lease — deposit not confirmed yet. Starts ${startLabel}.`
      : 'Upcoming lease — deposit not confirmed yet.'
  } else if (details.state === 'Expired') {
    title = 'Expired'
    body = endLabel
      ? `Lease ended on ${endLabel}.`
      : 'Lease term has ended.'
  } else {
    title = 'Upcoming'
    body = startLabel
      ? `Lease has not started yet. Begins ${startLabel}.`
      : 'Lease has not started yet.'
  }

  return (
    <span ref={rootRef} className={cn('relative inline-flex shrink-0', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex h-[1.15em] w-[1.15em] items-center justify-center rounded-sm text-ink-muted',
          'transition-colors hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
          isActive && 'text-[color:var(--deposit-fg)]',
          details.awaitingDeposit && 'text-accent'
        )}
        title={`${title}: ${body}`}
        aria-label={`${title}. ${body} Click for details.`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <Icon className="h-[0.85em] w-[0.85em]" strokeWidth={2.75} aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="status"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-20 w-max max-w-[14rem] rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-surface-paper px-2.5 py-2 text-[11px] leading-snug text-ink shadow-lift"
        >
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-ink-muted">{body}</p>
        </div>
      ) : null}
    </span>
  )
}
