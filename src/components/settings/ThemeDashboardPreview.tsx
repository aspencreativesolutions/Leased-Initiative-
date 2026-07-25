import { cn } from '@/lib/utils'
import type { ThemeAppearance, ThemeId } from '@/themes/types'

interface ThemeDashboardPreviewProps {
  themeId: ThemeId
  /** Graphite light/dark — ignored by themes without appearance support */
  appearance?: ThemeAppearance
  /** Visual scale of the mock dashboard */
  size?: 'card' | 'expanded'
  className?: string
}

/**
 * Miniature Lease Initiative dashboard mockup styled with the real theme
 * tokens via scoped `data-theme` / `data-appearance`. Content is identical
 * across themes so users can compare finishes fairly.
 */
export function ThemeDashboardPreview({
  themeId,
  appearance = 'light',
  size = 'card',
  className,
}: ThemeDashboardPreviewProps) {
  const expanded = size === 'expanded'

  return (
    <div
      data-theme={themeId}
      data-appearance={themeId === 'graphite' ? appearance : undefined}
      className={cn(
        'overflow-hidden border-[length:var(--border-width)] border-line bg-surface text-left shadow-lift',
        'rounded-[var(--radius-lg)]',
        className
      )}
      aria-hidden
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b-[length:var(--border-width)] border-nav-border bg-nav-bg text-nav-fg',
          expanded ? 'px-3.5 py-3' : 'px-3 py-2.5'
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-display font-semibold tracking-tight',
              expanded ? 'text-sm' : 'text-[12px]'
            )}
          >
            Lease Initiative
          </p>
          <p
            className={cn(
              'truncate text-nav-fg-muted label-caps',
              expanded ? 'text-[10px]' : 'text-[9px]'
            )}
          >
            Landlord dashboard
          </p>
        </div>
        <div
          className={cn(
            'shrink-0 border-[length:var(--border-width)] border-nav-active/50 bg-nav-active/15 text-nav-fg label-caps',
            'rounded-[var(--radius-sm)]',
            expanded ? 'px-2.5 py-1.5 text-[10px]' : 'px-2 py-1 text-[9px]'
          )}
        >
          Tenants
        </div>
      </div>

      {/* Body */}
      <div className={cn(expanded ? 'space-y-3.5 p-3.5' : 'space-y-2.5 p-3')}>
        {/* Nav chip row */}
        <div className="flex flex-wrap gap-1.5">
          {['Overview', 'Payments', 'Docs'].map((label, i) => (
            <span
              key={label}
              className={cn(
                'border-[length:var(--border-width)] label-caps',
                'rounded-[var(--radius-sm)]',
                expanded ? 'px-2.5 py-1.5 text-[10px]' : 'px-2 py-1 text-[9px]',
                i === 0
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-line bg-surface-paper text-ink-muted'
              )}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Tenant / dashboard tile */}
        <div
          className={cn(
            'border-[length:var(--border-width)] border-line bg-surface-paper shadow-lift',
            'rounded-[var(--radius-md)]',
            expanded ? 'p-3.5' : 'p-3'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate font-display font-semibold text-ink',
                  expanded ? 'text-[15px]' : 'text-[13px]'
                )}
              >
                Jordan Lee
              </p>
              <p
                className={cn(
                  'truncate text-ink-muted',
                  expanded ? 'mt-0.5 text-xs' : 'mt-0.5 text-[11px]'
                )}
              >
                214 Oak Street · Unit 3B
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 border-[length:var(--border-width)] label-caps',
                'rounded-[var(--radius-sm)]',
                'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]',
                expanded ? 'px-2.5 py-1.5 text-[10px]' : 'px-2 py-1 text-[9px]'
              )}
            >
              Current
            </span>
          </div>

          <div
            className={cn(
              'mt-2.5 flex items-center justify-between border-t-[length:var(--border-width)] border-line',
              expanded ? 'pt-3' : 'pt-2.5'
            )}
          >
            <div>
              <p className={cn('text-ink-faint label-caps', expanded ? 'text-[10px]' : 'text-[9px]')}>
                Next rent
              </p>
              <p
                className={cn(
                  'font-display font-semibold text-ink',
                  expanded ? 'text-base' : 'text-sm'
                )}
              >
                $1,850
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center justify-center border-[length:var(--border-width)] border-brand bg-brand text-surface-paper label-caps',
                'rounded-[var(--radius-sm)]',
                expanded ? 'min-h-9 px-3.5 text-[11px]' : 'min-h-8 px-3 text-[10px]'
              )}
            >
              Message
            </span>
          </div>
        </div>

        {/* Secondary tiles — spacing, accent, card mood */}
        <div className={cn('grid grid-cols-2', expanded ? 'gap-2.5' : 'gap-2')}>
          <div
            className={cn(
              'border-[length:var(--border-width)] border-line bg-surface-paper shadow-lift',
              'rounded-[var(--radius-md)]',
              expanded ? 'p-3' : 'p-2.5'
            )}
          >
            <p className={cn('text-ink-faint label-caps', expanded ? 'text-[10px]' : 'text-[9px]')}>
              Open tickets
            </p>
            <p
              className={cn(
                'mt-0.5 font-display font-semibold text-ink',
                expanded ? 'text-base' : 'text-sm'
              )}
            >
              2
            </p>
          </div>
          <div
            className={cn(
              'border-[length:var(--border-width)] border-accent bg-accent-light',
              'rounded-[var(--radius-md)]',
              expanded ? 'p-3' : 'p-2.5'
            )}
          >
            <p className={cn('text-accent label-caps', expanded ? 'text-[10px]' : 'text-[9px]')}>
              Due soon
            </p>
            <p
              className={cn(
                'mt-0.5 font-display font-semibold text-ink',
                expanded ? 'text-base' : 'text-sm'
              )}
            >
              1 payment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
