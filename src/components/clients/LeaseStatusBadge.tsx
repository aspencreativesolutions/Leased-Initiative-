import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getLeaseStatusHoverDetail,
  type LeaseStatusDetails,
  type LeaseTimelineState,
} from '@/lib/clientUtils'

const stateStyles: Record<LeaseTimelineState, string> = {
  Active:
    'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
  'Ending Soon':
    'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
  Upcoming: 'border-ink/20 bg-surface text-ink-muted',
  Expired: 'border-[color:var(--line)] bg-transparent text-ink-faint',
}

const awaitingDepositStyles = 'border-accent/40 bg-accent-light text-accent'

interface LeaseStatusBadgeProps {
  details: LeaseStatusDetails
  className?: string
  /** When awaiting deposit, activates Confirm Payment on click. */
  onConfirmPayment?: () => void
  confirmingPayment?: boolean
  /**
   * Constrain width to the parent column (mobile Official Tenants tiles)
   * so long lease ranges stay on one line inside the tile.
   */
  constrainToParent?: boolean
}

/**
 * Official Tenants Lease Status: duration + dates always visible on one line.
 * Confirm Payment remains available when awaiting deposit.
 */
export function LeaseStatusBadge({
  details,
  className,
  onConfirmPayment,
  confirmingPayment = false,
  constrainToParent = false,
}: LeaseStatusBadgeProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [maxWidth, setMaxWidth] = useState<number | null>(null)

  const state = details.state
  const hoverDetail = getLeaseStatusHoverDetail({
    ...details,
    // Prefer duration/dates even while awaiting deposit.
    awaitingDeposit: false,
  })
  const canConfirm = Boolean(details.awaitingDeposit && onConfirmPayment)

  useLayoutEffect(() => {
    if (!constrainToParent) {
      setMaxWidth(null)
      return
    }
    const el = wrapRef.current
    if (!el) return

    const update = () => {
      const parent = el.parentElement
      if (!parent) return
      const width = Math.floor(parent.getBoundingClientRect().width)
      if (width > 0) setMaxWidth(width)
    }

    update()
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(el.parentElement ?? el)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [constrainToParent])

  if (!state && !details.awaitingDeposit) {
    return (
      <span
        className={cn(
          'inline-block max-w-full text-xs font-medium leading-snug text-ink',
          className
        )}
      >
        {details.status}
      </span>
    )
  }

  const durationLine = hoverDetail?.lines?.[0] ?? hoverDetail?.summaryLine
  const datesLine = hoverDetail?.lines?.[1]
  const oneLineSummary =
    datesLine && durationLine
      ? `${durationLine} · ${datesLine}`
      : durationLine || details.status
  const summary =
    confirmingPayment && canConfirm ? 'Confirming…' : oneLineSummary

  const tagShell = cn(
    'inline-flex max-w-full flex-col items-start justify-center gap-0.5',
    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
    'px-1.5 py-1 text-[10px] font-semibold leading-snug tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    canConfirm && 'cursor-pointer',
    details.awaitingDeposit
      ? awaitingDepositStyles
      : state
        ? stateStyles[state]
        : 'border-ink/20 bg-surface text-ink-muted',
    className
  )

  const content = (
    <>
      <span className="block w-full truncate whitespace-nowrap" title={summary}>
        {summary}
      </span>
      {canConfirm && !confirmingPayment ? (
        <span className="block w-full text-[9px] font-bold uppercase tracking-wide opacity-90">
          Confirm Payment
        </span>
      ) : null}
    </>
  )

  return (
    <div
      ref={wrapRef}
      className="lease-status-badge-wrap min-w-0 max-w-full"
      data-hover-cue="lease-status"
      style={maxWidth ? { maxWidth } : undefined}
    >
      {canConfirm ? (
        <button
          type="button"
          className={tagShell}
          disabled={confirmingPayment}
          aria-label={`${details.status}. ${summary}. Confirm Payment to mark the deposit complete.`}
          onClick={() => {
            if (!confirmingPayment) onConfirmPayment?.()
          }}
        >
          {content}
        </button>
      ) : (
        <span
          className={tagShell}
          aria-label={`${details.status}. ${summary}`}
        >
          {content}
        </span>
      )}
    </div>
  )
}
