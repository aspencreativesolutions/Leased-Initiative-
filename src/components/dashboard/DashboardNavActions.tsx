import { Plus, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const dashboardNavActionClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nav-active focus-visible:ring-offset-2 focus-visible:ring-offset-nav'

interface DashboardNavActionsProps {
  registrationCount: number
  onOpenRegistrations: () => void
  onOpenAddClient: () => void
}

export function DashboardNavActions({
  registrationCount,
  onOpenRegistrations,
  onOpenAddClient,
}: DashboardNavActionsProps) {
  return (
    <>
      <button
        type="button"
        data-onboarding="dashboard-registrations"
        className={cn(
          dashboardNavActionClass,
          'border-nav-fg/30 text-nav-fg-muted hover:border-nav-fg hover:text-nav-fg'
        )}
        onClick={onOpenRegistrations}
      >
        <UserPlus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        <span className="hidden sm:inline">View New Registers</span>
        <span className="sm:hidden">Registers</span>
        {registrationCount > 0 && (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
            {registrationCount}
          </span>
        )}
      </button>
      <button
        type="button"
        data-onboarding="dashboard-add-client"
        className={cn(
          dashboardNavActionClass,
          'border-nav-active bg-nav-active text-nav-fg hover:opacity-90'
        )}
        onClick={onOpenAddClient}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        Add Tenant
      </button>
    </>
  )
}
