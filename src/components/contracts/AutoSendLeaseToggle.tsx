import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

type AutoSendLeaseToggleProps = {
  className?: string
  /** Compact styling for modal headers */
  compact?: boolean
}

/**
 * Persist whether future generated lease drafts should auto-send to tenants.
 * Off by default — landlords review every draft before sending.
 */
export function AutoSendLeaseToggle({ className, compact = false }: AutoSendLeaseToggleProps) {
  const { settings, updateSettings } = useApp()
  const enabled = Boolean(settings.autoSendLeaseDrafts)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => updateSettings({ autoSendLeaseDrafts: !enabled })}
      className={cn(
        'flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-line/70 bg-surface px-3 py-2.5 text-left transition-colors hover:border-line',
        compact && 'py-2',
        className
      )}
    >
      <span
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-[length:var(--border-width)] transition-colors',
          enabled ? 'border-brand bg-brand' : 'border-line bg-surface-paper'
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full shadow-sm transition-all',
            enabled ? 'left-[1.05rem] bg-white' : 'left-0.5 bg-ink/40'
          )}
        />
      </span>
      <span className="min-w-0">
        <span className={cn('block font-semibold text-ink', compact ? 'text-xs' : 'text-sm')}>
          Automatically send drafted leases
        </span>
        <span
          className={cn(
            'mt-0.5 block text-ink-muted',
            compact ? 'text-[11px] leading-snug' : 'text-xs leading-snug'
          )}
        >
          Optional. Off by default — Accept &amp; Draft Lease creates a draft for Review &amp; Send.
          Turn on only if you want new drafts delivered to tenants as soon as they finish generating.
        </span>
      </span>
    </button>
  )
}
