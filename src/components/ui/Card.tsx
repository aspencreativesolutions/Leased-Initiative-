import type { HTMLAttributes, ReactNode } from 'react'
import { SectionHelpIcon } from '@/components/ui/SectionHelpIcon'
import { cn } from '@/lib/utils'

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
  help,
  action,
  dense = false,
  noBorder = false,
  children,
}: {
  title: string
  subtitle?: string
  /** When set, shows a ? icon next to the title instead of a persistent subtitle. */
  help?: string
  action?: ReactNode
  dense?: boolean
  /** Hide the rule under the header (seamless with content below). */
  noBorder?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        !noBorder && 'border-b-[length:var(--border-width)] border-line',
        dense ? 'mb-2.5 pb-2 sm:mb-3' : 'mb-3 pb-2 sm:mb-4 sm:pb-3'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className={cn('heading-display', dense ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl')}>
              {title}
            </h2>
            {help ? <SectionHelpIcon label={help} /> : null}
          </div>
          {subtitle && !help ? (
            <p className={cn('text-ink-muted', dense ? 'mt-0.5 text-xs sm:text-sm' : 'mt-0.5 text-xs sm:mt-1 sm:text-sm')}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children && <div className="mt-2.5 sm:mt-3">{children}</div>}
    </div>
  )
}
