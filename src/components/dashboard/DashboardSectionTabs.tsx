import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/studio', label: 'Tenants & Pending', end: true },
  { to: '/studio/alerts', label: 'Tenant Alerts', end: true },
] as const

export function DashboardSectionTabs({ alertCount = 0 }: { alertCount?: number }) {
  return (
    <div
      className="mb-5 flex gap-1 border-b-[length:var(--border-width)] border-line"
      role="tablist"
      aria-label="Dashboard views"
    >
      {tabs.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          role="tab"
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
              isActive
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            {label}
            {to === '/studio/alerts' && alertCount > 0 ? (
              <span className="rounded-sm border border-accent/40 bg-accent-light px-1.5 py-0 text-[10px] font-bold leading-4 text-accent">
                {alertCount}
              </span>
            ) : null}
          </span>
        </NavLink>
      ))}
    </div>
  )
}
