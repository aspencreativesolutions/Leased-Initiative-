import { cn } from '@/lib/utils'
import { Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
  /** Replaces the icon with a spinner (e.g. while tenants are still fetching). */
  loading?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  loading = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-ink/20 bg-surface-paper px-6 text-center',
        compact ? 'py-8' : 'py-14'
      )}
      aria-busy={loading || undefined}
      aria-live={loading ? 'polite' : undefined}
    >
      {loading ? (
        <Loader2
          className={cn('animate-spin text-ink', compact ? 'mb-2 h-6 w-6' : 'mb-4 h-8 w-8')}
          strokeWidth={1.5}
          aria-hidden
        />
      ) : (
        <Icon
          className={cn('text-ink', compact ? 'mb-2 h-6 w-6' : 'mb-4 h-8 w-8')}
          strokeWidth={1.5}
        />
      )}
      <h3 className={cn('heading-display', compact ? 'text-base' : 'text-lg')}>{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && !loading ? <div className={compact ? 'mt-4' : 'mt-6'}>{action}</div> : null}
    </div>
  )
}
