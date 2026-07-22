import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/studio/payments', label: 'Payments', end: true },
  { to: '/studio/payments/overdue', label: 'Overdue Rent', end: true },
] as const

export function PaymentsSectionTabs() {
  return (
    <div
      className="mb-5 flex gap-1 border-b-[length:var(--border-width)] border-line"
      role="tablist"
      aria-label="Payments views"
      data-onboarding="admin-payments-tabs"
    >
      {tabs.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          role="tab"
          data-onboarding={to.includes('overdue') ? 'admin-overdue-tab' : undefined}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
              isActive
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}
