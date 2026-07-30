import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  LogOut,
  UserCircle,
  Bell,
  Building2,
  Bug,
  Compass,
  Palette,
  Zap,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { restartOnboardingTour } from '@/components/onboarding/OnboardingTour'
import { CreativeStudiosBrand } from '@/components/brand/CreativeStudiosBrand'
import { BugReportModal } from '@/components/support/BugReportModal'
import {
  NavActionsMenu,
  type NavActionsMenuItem,
  type NavActionsMenuSection,
} from '@/components/layout/NavActionsMenu'
import { useTenantAlerts } from '@/hooks/useTenantAlerts'
import { buildUpcomingOpenings } from '@/lib/properties'
import { exitPublicDemo } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

function formatNavToday(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Compact date for the mobile branding stack (avoids colliding with Menu). */
function formatNavTodayCompact(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Local calendar day label that refreshes at midnight and when the tab becomes visible. */
function useLocalTodayLabel() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timeoutId = 0

    const sync = () => {
      setToday((prev) => {
        const next = new Date()
        return toLocalDateValue(prev) === toLocalDateValue(next) ? prev : next
      })
    }

    const scheduleMidnightRefresh = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      timeoutId = window.setTimeout(() => {
        sync()
        scheduleMidnightRefresh()
      }, Math.max(1_000, nextMidnight.getTime() - now.getTime() + 50))
    }

    sync()
    scheduleMidnightRefresh()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return {
    label: formatNavToday(today),
    compactLabel: formatNavTodayCompact(today),
    dateValue: toLocalDateValue(today),
  }
}

const links = [
  { to: '/studio', label: 'Tenants and Waiting', icon: LayoutDashboard, onboarding: 'admin-dashboard' },
  { to: '/studio/properties', label: 'Rentals', icon: Building2, onboarding: 'admin-properties' },
  { to: '/studio/contracts', label: 'Lease Agreements', icon: FileText, onboarding: 'admin-contracts' },
  { to: '/studio/payments', label: 'Payments', icon: DollarSign, onboarding: 'admin-payments' },
  { to: '/studio/alerts', label: 'Tenant Alerts', icon: Bell, onboarding: 'admin-tenant-alerts' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex w-full items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-2.5 text-[10px] font-semibold transition-colors md:gap-2 md:px-3 md:py-3 md:text-[11px]',
    isActive
      ? 'border-nav-active text-nav-fg'
      : 'border-transparent text-nav-fg-muted hover:border-nav-fg/25 hover:text-nav-fg'
  )

const navTodayClass =
  'pointer-events-none flex w-full cursor-default items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[10px] font-semibold tracking-wide text-nav-fg-muted/80 md:w-auto md:shrink-0 md:justify-start md:px-3 md:py-3 md:text-[11px]'

export function Navbar({ onStartTour }: { onStartTour?: () => void }) {
  const { user, logout, isPublicDemo } = useAuth()
  const { properties, clients, getContractForClient } = useApp()
  const navigate = useNavigate()
  const { unreadCount: unreadAlertCount } = useTenantAlerts()
  const { label: todayLabel, compactLabel: todayCompactLabel, dateValue: todayDateValue } =
    useLocalTodayLabel()
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const hasAvailableRentals = useMemo(
    () =>
      buildUpcomingOpenings(properties, clients, getContractForClient).some(
        (opening) => opening.kind === 'vacant'
      ),
    [properties, clients, getContractForClient]
  )

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

  const accountItems = useMemo((): NavActionsMenuItem[] => {
    const items: NavActionsMenuItem[] = []
    if (user) {
      items.push({
        id: 'profile',
        label: 'Company Profile & Preferences',
        icon: UserCircle,
        dataOnboarding: 'admin-profile',
        onSelect: () => navigate('/studio/profile'),
      })
    }
    items.push({
      id: 'sign-out',
      label: 'Sign out',
      icon: LogOut,
      onSelect: handleSignOut,
    })
    return items
  }, [handleSignOut, navigate, user])

  const helpSettingsItems = useMemo(
    (): NavActionsMenuItem[] => [
      {
        id: 'tour',
        label: 'Take the tour',
        icon: Compass,
        onSelect: () => {
          void restartOnboardingTour('admin', user?.id, () => onStartTour?.())
        },
      },
      {
        id: 'settings-business',
        label: 'Business Information',
        icon: Building2,
        dataOnboarding: 'admin-settings',
        onSelect: () => navigate('/studio/settings?tab=business'),
      },
      {
        id: 'settings-automation',
        label: 'Client Automation',
        icon: Zap,
        onSelect: () => navigate('/studio/settings?tab=automation'),
      },
      {
        id: 'settings-lease',
        label: 'Lease Defaults',
        icon: FileText,
        onSelect: () => navigate('/studio/settings?tab=lease'),
      },
      {
        id: 'settings-style',
        label: 'App Style',
        icon: Palette,
        dataOnboarding: 'admin-settings-menu-style',
        onSelect: () => navigate('/studio/settings?tab=style'),
      },
      {
        id: 'bug',
        label: 'Bug Report',
        icon: Bug,
        onSelect: () => setBugReportOpen(true),
      },
    ],
    [navigate, onStartTour, user?.id]
  )

  const utilityMenuSections = useMemo(
    (): NavActionsMenuSection[] => [
      { id: 'account', label: 'Account', items: accountItems },
      { id: 'help', label: 'Help and\nSettings', items: helpSettingsItems },
    ],
    [accountItems, helpSettingsItems]
  )

  const mobileMenuSections = useMemo((): NavActionsMenuSection[] => {
    const navigationItems = links.map(({ to, label, icon, onboarding }) => ({
      id: to,
      label,
      icon,
      dataOnboarding: onboarding,
      onSelect: () => navigate(to),
      trailing:
        to === '/studio/alerts' && unreadAlertCount > 0 ? (
          <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadAlertCount}
          </span>
        ) : to === '/studio/properties' && hasAvailableRentals ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-accent"
            aria-hidden
          />
        ) : undefined,
      ariaLabel:
        to === '/studio/properties' && hasAvailableRentals
          ? `${label}, available rentals`
          : to === '/studio/alerts' && unreadAlertCount > 0
            ? `${label}, ${unreadAlertCount} unread`
            : undefined,
    }))

    return [
      { id: 'navigation', label: 'Navigation', items: navigationItems },
      ...utilityMenuSections,
    ]
  }, [hasAvailableRentals, navigate, unreadAlertCount, utilityMenuSections])

  return (
    <>
      <div className="w-full max-w-full border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
        <div
          className={cn(
            'flex w-full items-center justify-between gap-3',
            'min-h-[3.75rem] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
            'pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5',
            'md:h-[4.25rem] md:min-h-0 md:items-center md:px-6 md:py-0 lg:px-10 xl:px-12'
          )}
        >
          <NavLink to="/studio" className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <CreativeStudiosBrand
              mobileSubtitle={
                <time dateTime={todayDateValue} aria-label={`Today, ${todayLabel}`}>
                  {todayCompactLabel}
                </time>
              }
            />
          </NavLink>

          {/* Mobile: Menu with navigation + account / help */}
          <NavActionsMenu
            className="md:hidden"
            sections={mobileMenuSections}
            triggerOnboarding="admin-mobile-menu"
            tourNoticeScope="mobile"
          />

          {/* Desktop / tablet: consolidated Menu (utility actions only) */}
          <NavActionsMenu
            className="hidden md:block"
            sections={utilityMenuSections}
            triggerOnboarding="admin-desktop-menu"
            tourNoticeScope="desktop"
          />
        </div>
      </div>

      {/* Desktop / tablet secondary nav — hidden on mobile */}
      <nav
        className="sticky top-0 z-50 hidden w-full max-w-full border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg md:flex md:items-stretch md:gap-4 md:px-6 lg:gap-6 lg:px-10 xl:px-12"
        aria-label="Main navigation"
      >
        <div className="flex w-full min-w-0 flex-col md:flex-1 md:flex-row md:items-stretch">
          <time
            dateTime={todayDateValue}
            className={cn(navTodayClass, 'border-b border-nav-border/40 md:border-b-2 md:border-transparent')}
            aria-label={`Today, ${todayLabel}`}
          >
            {todayLabel}
          </time>
          <div className="grid w-full grid-cols-5 items-stretch md:flex md:min-w-0 md:flex-1 md:justify-evenly [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
            {links.map(({ to, label, icon: Icon, onboarding }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/studio'}
                data-onboarding={onboarding}
                className={({ isActive }) =>
                  cn(navLinkClass({ isActive }), 'relative md:flex-1 md:justify-center')
                }
                title={label}
                aria-label={
                  to === '/studio/properties' && hasAvailableRentals
                    ? `${label}, available rentals`
                    : label
                }
              >
                <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2.25} />
                <span className="nav-link-label hidden md:inline">{label}</span>
                {to === '/studio/properties' && hasAvailableRentals ? (
                  <span className="nav-available-rentals-dot" aria-hidden />
                ) : null}
                {to === '/studio/alerts' && unreadAlertCount > 0 ? (
                  <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                    {unreadAlertCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </>
  )
}
