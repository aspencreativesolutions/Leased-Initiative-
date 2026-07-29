import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Clock, Wallet } from 'lucide-react'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
import { DEMO_LEASE_TAG_NUDGE_EVENT } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'
import {
  getLeaseStatusHoverDetail,
  type LeaseStatusDetails,
  type LeaseTimelineState,
} from '@/lib/clientUtils'

const stateStyles: Record<LeaseTimelineState, string> = {
  Active:
    'lease-status-badge--active border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
  // Ending Soon shares Active green — Official Tenants only shows Active / Upcoming by default.
  'Ending Soon':
    'lease-status-badge--active border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
  Upcoming: 'border-ink/20 bg-surface text-ink-muted',
  Expired: 'border-[color:var(--line)] bg-transparent text-ink-faint',
}

const awaitingDepositStyles = 'border-accent/40 bg-accent-light text-accent'

interface LeaseStatusBadgeProps {
  details: LeaseStatusDetails
  className?: string
  /** When awaiting deposit, activates Confirm Payment on hover/click. */
  onConfirmPayment?: () => void
  confirmingPayment?: boolean
  /**
   * Constrain expand width to the parent column (mobile Official Tenants tiles)
   * so long lease ranges wrap to two lines instead of overflowing.
   */
  constrainToParent?: boolean
}

function leaseStatusLeadingIcon(details: LeaseStatusDetails) {
  if (details.awaitingDeposit) {
    return <Wallet className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
  }
  const state = details.state
  if (state === 'Active' || state === 'Ending Soon') {
    return <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={2.75} aria-hidden />
  }
  if (state === 'Upcoming') {
    return <Clock className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
  }
  return null
}

/** Compact lease timeline badge for Official Tenants (and mobile cards). */
export function LeaseStatusBadge({
  details,
  className,
  onConfirmPayment,
  confirmingPayment = false,
  constrainToParent = false,
}: LeaseStatusBadgeProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [maxExpandWidth, setMaxExpandWidth] = useState<number | null>(null)
  const [nudge, setNudge] = useState(false)
  const [forceRevealed, setForceRevealed] = useState(false)

  const state = details.state
  const label = details.status
  const hoverDetail = getLeaseStatusHoverDetail(details)
  const canConfirm = Boolean(details.awaitingDeposit && onConfirmPayment)
  const useStack = Boolean(constrainToParent && hoverDetail?.lines)

  useLayoutEffect(() => {
    if (!constrainToParent) {
      setMaxExpandWidth(null)
      return
    }
    const el = wrapRef.current
    if (!el) return

    const update = () => {
      const parent = el.parentElement
      if (!parent) return
      const width = Math.floor(parent.getBoundingClientRect().width)
      if (width > 0) setMaxExpandWidth(width)
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

  useEffect(() => {
    if (!constrainToParent) return
    const timers: number[] = []
    const onNudge = () => {
      setNudge(true)
      timers.push(
        window.setTimeout(() => setForceRevealed(true), 280),
        window.setTimeout(() => setForceRevealed(false), 1600),
        window.setTimeout(() => setNudge(false), 2400)
      )
    }
    window.addEventListener(DEMO_LEASE_TAG_NUDGE_EVENT, onNudge)
    return () => {
      window.removeEventListener(DEMO_LEASE_TAG_NUDGE_EVENT, onNudge)
      for (const id of timers) window.clearTimeout(id)
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
        {label}
      </span>
    )
  }

  const tagShell = cn(
    'in-place-hover--lease-tag',
    'items-center justify-center text-center',
    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
    'text-[10px] font-bold leading-none tracking-tight tabular-nums',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    hoverDetail && 'cursor-default',
    canConfirm && 'cursor-pointer',
    details.awaitingDeposit
      ? awaitingDepositStyles
      : state
        ? stateStyles[state]
        : 'border-ink/20 bg-surface text-ink-muted',
    nudge && 'lease-status-badge--nudge',
    className
  )

  const tagLayerClass =
    'in-place-hover__lease-label text-center text-[10px] font-bold leading-none tracking-tight'
  const leadingIcon = leaseStatusLeadingIcon(details)

  if (!hoverDetail) {
    return (
      <div className="lease-status-badge-wrap min-w-0 max-w-full">
        <span className={cn(tagShell, 'inline-flex')}>
          <span className={tagLayerClass}>
            {leadingIcon}
            {label}
          </span>
        </span>
      </div>
    )
  }

  const secondaryLabel = confirmingPayment && canConfirm ? 'Confirming…' : null

  return (
    <div ref={wrapRef} className="lease-status-badge-wrap min-w-0 max-w-full">
      <InPlaceHoverText
        primary={
          <span className={tagLayerClass}>
            {leadingIcon}
            {label}
          </span>
        }
        secondary={
          <span
            className={cn(
              tagLayerClass,
              useStack && 'in-place-hover__lease-label--stack'
            )}
          >
            {canConfirm ? (
              <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={2.75} aria-hidden />
            ) : null}
            {secondaryLabel ? (
              secondaryLabel
            ) : useStack && hoverDetail.lines ? (
              <>
                <span className="block w-full">{hoverDetail.lines[0]}</span>
                <span className="block w-full">{hoverDetail.lines[1]}</span>
              </>
            ) : (
              hoverDetail.summaryLine
            )}
          </span>
        }
        ariaLabel={
          canConfirm
            ? `${label}. Confirm Payment to mark the deposit complete and move this tenant to Upcoming.`
            : `${label}. ${hoverDetail.summaryLine}`
        }
        className={tagShell}
        expandOnReveal
        overlayExpand
        maxExpandWidth={maxExpandWidth}
        forceRevealed={forceRevealed}
        onActivate={
          canConfirm
            ? () => {
                if (!confirmingPayment) onConfirmPayment?.()
              }
            : undefined
        }
        disabled={confirmingPayment && canConfirm}
      />
    </div>
  )
}
