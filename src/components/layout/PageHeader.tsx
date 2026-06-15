import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: string
  tag?: ReactNode
  action?: ReactNode
  /** Tighter spacing on small screens (e.g. dashboard hero) */
  compact?: boolean
}

export function PageHeader({ title, subtitle, tag, action, compact }: PageHeaderProps) {
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
              compact ? 'text-xl sm:text-3xl' : 'text-2xl sm:text-3xl'
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {tag && <div className="w-full shrink-0 sm:w-auto">{tag}</div>}
      </div>
      {action && (
        <div
          className={cn(
            'flex shrink-0 flex-wrap',
            compact ? 'mt-2 gap-1.5 sm:mt-3 sm:gap-2' : 'mt-3 gap-2'
          )}
        >
          {action}
        </div>
      )}
    </div>
  )
}
