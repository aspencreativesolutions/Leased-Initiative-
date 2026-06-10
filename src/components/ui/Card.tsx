import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
  const paddingClass = { none: 'p-0', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding]
  return (
    <div
      className={cn(
        'w-full min-w-0 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper',
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
      <div>
        <h2 className="heading-display text-xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
