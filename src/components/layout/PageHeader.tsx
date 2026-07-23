import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  tag?: ReactNode
  action?: ReactNode
  /**
   * Content below the title/subtitle row and still above the header rule
   * (e.g. a right-aligned controls card).
   */
  below?: ReactNode
  /** Tighter spacing on small screens (e.g. dashboard hero) */
  compact?: boolean
  /** Larger page title for primary portal surfaces */
  prominent?: boolean
}

export function PageHeader({
  title,
  subtitle,
  tag,
  action,
  below,
  compact,
  prominent,
}: PageHeaderProps) {
  const subtitleOffset = prominent ? 'mt-2' : 'mt-0.5'

  return (
    <div
      className={cn(
        'border-b-[length:var(--border-width)] border-ink',
        compact ? 'mb-3 pb-2 sm:mb-5 sm:pb-3' : 'mb-5 pb-3'
      )}
    >
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-start sm:justify-between',
          compact ? 'gap-2 sm:gap-3' : 'gap-3'
        )}
      >
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'heading-display',
              prominent
                ? 'text-3xl sm:text-4xl lg:text-5xl'
                : compact
                  ? 'text-xl sm:text-3xl'
                  : 'text-2xl sm:text-3xl'
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              className={cn(
                'text-ink-muted',
                subtitleOffset,
                prominent && 'space-y-0.5 text-base sm:text-lg',
                !prominent && 'text-sm'
              )}
            >
              {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
            </div>
          )}
        </div>
        {(tag || action) && (
          <div
            className={cn(
              'flex w-full shrink-0 flex-wrap items-center sm:w-auto sm:justify-end',
              compact ? 'gap-1.5 sm:gap-2' : 'gap-2'
            )}
          >
            {tag}
            {action}
          </div>
        )}
      </div>
      {below ? <div className={subtitleOffset}>{below}</div> : null}
    </div>
  )
}
