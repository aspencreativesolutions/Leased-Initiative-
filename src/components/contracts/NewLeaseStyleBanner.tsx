import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface NewLeaseStyleBannerProps {
  templateName: string
  /** Pending tenants copy vs Lease Agreements page copy */
  variant: 'pending' | 'contracts'
  selecting?: boolean
  onReplaceAll: () => void
  onReplaceSelect: () => void
  onCancel: () => void
  onApplySelected?: () => void
  selectedCount?: number
  busy?: boolean
  className?: string
}

/**
 * Animated blue tag after a new default lease style is confirmed.
 * Offers replace-all / replace-select (and cancel).
 */
export function NewLeaseStyleBanner({
  templateName,
  variant,
  selecting = false,
  onReplaceAll,
  onReplaceSelect,
  onCancel,
  onApplySelected,
  selectedCount = 0,
  busy = false,
  className,
}: NewLeaseStyleBannerProps) {
  const replaceAllLabel = 'Apply to All'
  const replaceSelectLabel = 'Replace select agreements'

  return (
    <div
      role="status"
      className={cn(
        'new-lease-style-banner flex flex-col gap-3 rounded-[var(--radius-lg)] border-2 border-brand bg-brand/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <p className="heading-display text-sm font-semibold text-brand">
          New lease agreement style!
        </p>
        <p className="mt-0.5 text-xs leading-snug text-ink-muted">
          {templateName
            ? `“${templateName}” is now your default. Tenant details and signatures stay intact when you restyle.`
            : 'A new default style is ready. Tenant details and signatures stay intact when you restyle.'}
        </p>
        {selecting ? (
          <p className="mt-2 text-xs font-medium text-ink">
            {variant === 'pending'
              ? 'Select one or more pending tenants below, then apply the new style.'
              : 'Select one or more lease tiles below, then apply the new style.'}{' '}
            {selectedCount > 0 ? (
              <span className="text-brand">
                {selectedCount} selected
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy || selectedCount === 0}
              onClick={onApplySelected}
            >
              Apply to selected ({selectedCount})
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={onReplaceAll}>
              {replaceAllLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onReplaceSelect}
            >
              {replaceSelectLabel}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted transition-colors hover:bg-brand/15 hover:text-ink"
              aria-label="Dismiss new lease style prompt"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
