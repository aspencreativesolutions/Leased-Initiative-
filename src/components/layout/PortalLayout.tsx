import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FileText, GitBranch, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PortalStyleButton } from '@/components/portal/PortalStyleButton'
import { PortalNotificationBanner } from '@/components/portal/PortalNotificationBanner'
import {
  OnboardingRestartButton,
  OnboardingTour,
} from '@/components/onboarding/OnboardingTour'
import { Button } from '@/components/ui/Button'
import { useClientNotifications } from '@/hooks/useClientNotifications'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { cn } from '@/lib/utils'

export function PortalNavbar({ onStartTour }: { onStartTour?: () => void }) {
  const { user, logout } = useAuth()

  return (
    <header
      data-onboarding="portal-nav"
      className="sticky top-0 z-40 border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg"
    >
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10">
        <NavLink to="/portal" className="group flex min-w-0 items-center gap-2.5 shrink sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border-[length:var(--border-width)] border-nav-fg/80 bg-transparent font-display text-base font-bold tracking-tight transition-colors group-hover:border-nav-active group-hover:text-nav-active sm:h-10 sm:w-10 sm:text-lg">
            CC
          </div>
          <div className="min-w-0 leading-none">
            <span className="block truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
              Client Craft
            </span>
            <span className="label-caps mt-0.5 hidden !text-nav-fg-muted sm:mt-1 sm:block">
              Client Portal
            </span>
          </div>
        </NavLink>

        <nav className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 text-[11px] font-semibold transition-colors',
                isActive ? 'text-nav-fg' : 'text-nav-fg-muted hover:text-nav-fg'
              )
            }
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </NavLink>
          <NavLink
            to="/portal/timeline"
            data-onboarding="portal-timeline-nav"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 text-[11px] font-semibold transition-colors',
                isActive ? 'text-nav-fg' : 'text-nav-fg-muted hover:text-nav-fg'
              )
            }
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </NavLink>
          <PortalStyleButton />
          <OnboardingRestartButton role="client" onStart={() => onStartTour?.()} />
          {user && (
            <NavLink
              to="/portal/profile"
              title="My profile"
              className={({ isActive }) =>
                cn(
                  'max-w-[7rem] truncate text-[11px] font-semibold transition-colors sm:max-w-none',
                  isActive
                    ? 'text-nav-fg underline decoration-nav-active underline-offset-4'
                    : 'text-nav-fg-muted hover:text-nav-fg hover:underline hover:underline-offset-4'
                )
              }
            >
              {user.name}
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="shrink-0 !border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </nav>
      </div>
    </header>
  )
}

export function PortalLayout() {
  const { data } = usePortalDashboard()
  const { notifications, refresh } = useClientNotifications()
  const [tourStart, setTourStart] = useState(false)

  const onboardingContext = {
    linked: data?.linked,
    projectStarted: data?.projectStarted,
    hasContracts: (data?.contracts?.length ?? 0) > 0,
    hasInvoice: Boolean(data?.invoice?.sentToPortalAt),
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface">
      <PortalNavbar onStartTour={() => setTourStart(true)} />
      <main className="w-full px-4 pt-8 pb-12 sm:px-6 sm:pt-8 sm:pb-14 lg:px-10 xl:px-12">
        <div className="mx-auto w-full min-w-0">
          {notifications.length > 0 ? (
            <PortalNotificationBanner notifications={notifications} onDismiss={refresh} />
          ) : (
            <div
              data-onboarding="portal-notifications"
              className="mb-6 rounded-sm border border-dashed border-line/80 px-3 py-2 text-xs text-ink-faint"
            >
              Project updates and reminders will appear here automatically.
            </div>
          )}
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Need help? Contact your designer for assistance with your account.
      </footer>
      <OnboardingTour
        role="client"
        context={onboardingContext}
        forceStart={tourStart}
        onForceStartHandled={() => setTourStart(false)}
      />
    </div>
  )
}
