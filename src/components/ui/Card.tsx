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
      className={cn('paper-box w-full min-w-0', paddingClass, className)}
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
  dense = false,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  dense?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-2 border-b border-line',
        dense ? 'mb-2.5 pb-2 sm:mb-3' : 'mb-3 pb-2 sm:mb-4 sm:pb-3'
      )}
    >
      <div className="min-w-0">
        <h2 className={cn('heading-display', dense ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl')}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn('text-ink-muted', dense ? 'mt-0.5 text-xs sm:text-sm' : 'mt-0.5 text-xs sm:mt-1 sm:text-sm')}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
