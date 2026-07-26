import { Check, Clock, Wallet } from 'lucide-react'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
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
  Upcoming: 'border-ink/15 bg-surface text-ink-muted',
  Expired: 'border-line bg-transparent text-ink-faint',
}

const awaitingDepositStyles =
  'border-accent/35 bg-accent-light text-accent'

interface LeaseStatusBadgeProps {
  details: LeaseStatusDetails
  className?: string
  /** When awaiting deposit, activates Confirm Payment on hover/click. */
  onConfirmPayment?: () => void
  confirmingPayment?: boolean
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
}: LeaseStatusBadgeProps) {
  const state = details.state
  const label = details.status
  const hoverDetail = getLeaseStatusHoverDetail(details)
  const canConfirm = Boolean(details.awaitingDeposit && onConfirmPayment)

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
        : 'border-ink/15 bg-surface text-ink-muted',
    className
  )

  const tagLayerClass =
    'in-place-hover__lease-label text-center text-[10px] font-bold tracking-tight'
  const leadingIcon = leaseStatusLeadingIcon(details)

  if (!hoverDetail) {
    return (
      <span className={cn(tagShell, 'inline-flex')}>
        <span className={tagLayerClass}>
          {leadingIcon}
          {label}
        </span>
      </span>
    )
  }

  return (
    <InPlaceHoverText
      primary={
        <span className={tagLayerClass}>
          {leadingIcon}
          {label}
        </span>
      }
      secondary={
        <span className={tagLayerClass}>
          {canConfirm ? (
            <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={2.75} aria-hidden />
          ) : null}
          {confirmingPayment && canConfirm ? 'Confirming…' : hoverDetail.summaryLine}
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
      onActivate={
        canConfirm
          ? () => {
              if (!confirmingPayment) onConfirmPayment?.()
            }
          : undefined
      }
      disabled={confirmingPayment && canConfirm}
    />
  )
}
