import { useCallback, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Compass, FileText, GitBranch, LogOut, Palette, UserCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePortalTheme } from '@/context/PortalThemeContext'
import { CreativeStudiosBrand } from '@/components/brand/CreativeStudiosBrand'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { PortalStyleButton } from '@/components/portal/PortalStyleButton'
import { PortalStyleModal } from '@/components/portal/PortalStyleModal'
import { PortalNotificationBanner } from '@/components/portal/PortalNotificationBanner'
import {
  OnboardingRestartButton,
  OnboardingTour,
  restartOnboardingTour,
} from '@/components/onboarding/OnboardingTour'
import { NavActionsMenu } from '@/components/layout/NavActionsMenu'
import { Button } from '@/components/ui/Button'
import { useClientNotifications } from '@/hooks/useClientNotifications'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { exitPublicDemo } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

export function PortalNavbar({ onStartTour }: { onStartTour?: () => void }) {
  const { user, logout, isPublicDemo } = useAuth()
  const navigate = useNavigate()
  const { appearance, setAppearance, supportsAppearance } = usePortalTheme()
  const [styleOpen, setStyleOpen] = useState(false)

  const handleSignOut = useCallback(() => {
    if (isPublicDemo) {
      void (async () => {
        logout()
        await exitPublicDemo()
        navigate('/', { replace: true })
      })()
      return
    }
    logout()
  }, [isPublicDemo, logout, navigate])

  const mobileMenuItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: FileText,
        onSelect: () => navigate('/portal'),
      },
      {
        id: 'timeline',
        label: 'Timeline',
        icon: GitBranch,
        onSelect: () => navigate('/portal/timeline'),
      },
      {
        id: 'style',
        label: 'Choose Style',
        icon: Palette,
        onSelect: () => setStyleOpen(true),
      },
      {
        id: 'tour',
        label: 'Take the tour',
        icon: Compass,
        onSelect: () => {
          void restartOnboardingTour('client', user?.id, () => onStartTour?.())
        },
      },
      ...(user
        ? [
            {
              id: 'profile',
              label: 'My profile',
              icon: UserCircle,
              onSelect: () => navigate('/portal/profile'),
            },
          ]
        : []),
      {
        id: 'sign-out',
        label: 'Sign out',
        icon: LogOut,
        onSelect: handleSignOut,
      },
    ],
    [handleSignOut, navigate, onStartTour, user]
  )

  return (
    <header
      data-onboarding="portal-nav"
      className="sticky top-0 z-40 border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg"
    >
      <div className="relative flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10">
        <NavLink to="/portal" className="group flex min-w-0 items-center shrink">
          <CreativeStudiosBrand subtitle="Tenant Portal" />
        </NavLink>

        {/* Mobile tour hook — sits under the Menu control */}
        <span
          data-onboarding="portal-timeline-nav"
          className="pointer-events-none absolute right-4 top-1/2 h-9 w-24 -translate-y-1/2 md:hidden"
        />

        {/* Mobile: single Menu with every top-bar action */}
        <NavActionsMenu
          items={mobileMenuItems}
          header={
            supportsAppearance ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-ink-muted">Appearance</span>
                <AppearanceToggle appearance={appearance} onChange={setAppearance} />
              </div>
            ) : null
          }
        />

        {/* Desktop / tablet: full toolbar */}
        <nav className="hidden min-w-0 items-center gap-2 overflow-x-auto sm:gap-3 md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <span>Dashboard</span>
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
            <span>Timeline</span>
          </NavLink>
          {supportsAppearance && (
            <AppearanceToggle
              appearance={appearance}
              onChange={setAppearance}
              variant="nav"
            />
          )}
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
            onClick={handleSignOut}
            className="shrink-0 !border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Sign out</span>
          </Button>
        </nav>
      </div>

      <PortalStyleModal open={styleOpen} onClose={() => setStyleOpen(false)} />
    </header>
  )
}

export function PortalLayout() {
  const { data } = usePortalDashboard()
  const { notifications, refresh } = useClientNotifications()
  const [tourStart, setTourStart] = useState(false)

  const onboardingContext = useMemo(
    () => ({
      linked: data?.linked,
      projectStarted: data?.projectStarted,
      hasContracts: (data?.contracts?.length ?? 0) > 0,
      hasInvoice: Boolean(data?.invoice?.sentToPortalAt),
    }),
    [
      data?.linked,
      data?.projectStarted,
      data?.contracts?.length,
      data?.invoice?.sentToPortalAt,
    ]
  )

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface">
      <PortalNavbar onStartTour={() => setTourStart(true)} />
      <main className="w-full px-4 pt-8 pb-12 sm:px-6 sm:pt-8 sm:pb-14 lg:px-10 xl:px-12">
        <div className="mx-auto w-full min-w-0">
          {notifications.length > 0 ? (
            <PortalNotificationBanner notifications={notifications} onDismiss={refresh} />
          ) : null}
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Need help? Contact your landlord for assistance with your account.
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
