import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-2 border-b-[length:var(--border-width)] border-ink pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="heading-display text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  )
}
