import { LayoutDashboard, Users, UserPlus, FileText, Calendar, Settings, DollarSign, LogOut, ExternalLink, UserCircle } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDashboardNavActionsOptional } from '@/context/DashboardNavActionsContext'
import { useTheme } from '@/context/ThemeContext'
import { OnboardingRestartButton } from '@/components/onboarding/OnboardingTour'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { AppStyleButton } from '@/components/settings/AppStyleButton'
import { CreativeStudiosBrand } from '@/components/brand/CreativeStudiosBrand'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/studio', label: 'Dashboard', icon: LayoutDashboard, onboarding: 'admin-dashboard' },
  { to: '/studio/users', label: 'Users', icon: UserPlus, onboarding: 'admin-users' },
  { to: '/studio/clients', label: 'Tenants', icon: Users, onboarding: 'admin-clients' },
  { to: '/studio/contracts', label: 'Leases', icon: FileText, onboarding: 'admin-contracts' },
  { to: '/studio/payments', label: 'Payments', icon: DollarSign, onboarding: 'admin-payments' },
  { to: '/studio/calendar', label: 'Calendar', icon: Calendar, onboarding: 'admin-calendar' },
  { to: '/studio/profile', label: 'Profile', icon: UserCircle },
  { to: '/studio/settings', label: 'Settings', icon: Settings, onboarding: 'admin-settings' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-2.5 text-[10px] font-semibold transition-colors md:justify-start md:gap-2 md:px-4 md:py-3 md:text-[11px]',
    isActive
      ? 'border-nav-active text-nav-fg'
      : 'border-transparent text-nav-fg-muted hover:border-nav-fg/25 hover:text-nav-fg'
  )

function isDashboardNavActive(pathname: string, isActive: boolean) {
  return isActive || pathname.startsWith('/studio/alerts')
}

export function Navbar({ onStartTour }: { onStartTour?: () => void }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const dashboardActions = useDashboardNavActionsOptional()?.actions
  const { appearance, setAppearance, supportsAppearance } = useTheme()

  return (
    <>
      <div className="w-full max-w-full border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10 xl:px-12">
          <NavLink to="/studio" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <CreativeStudiosBrand />
          </NavLink>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              to="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-nav-fg/30 px-2.5 py-1.5 text-[10px] font-semibold text-nav-fg-muted transition-colors hover:border-nav-fg hover:text-nav-fg"
              title="Tenant portal"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </Link>
            {supportsAppearance && (
              <AppearanceToggle
                appearance={appearance}
                onChange={setAppearance}
                variant="nav"
              />
            )}
            <AppStyleButton />
            <OnboardingRestartButton role="admin" onStart={() => onStartTour?.()} />
            {user && (
              <NavLink
                to="/studio/profile"
                className={({ isActive }) =>
                  cn(
                    'hidden items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-[10px] font-semibold transition-colors lg:flex',
                    isActive
                      ? 'border-nav-active text-nav-fg'
                      : 'border-nav-fg/30 text-nav-fg-muted hover:border-nav-fg hover:text-nav-fg'
                  )
                }
                title="My profile"
              >
                <UserCircle className="h-3.5 w-3.5" />
                {user.name}
              </NavLink>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="!border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <nav
        className="sticky top-0 z-50 flex w-full max-w-full flex-col border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg md:flex-row md:items-stretch md:justify-between md:px-6 lg:px-10 xl:px-12"
        aria-label="Main navigation"
      >
        <div className="grid w-full grid-cols-8 items-stretch md:flex md:min-w-0 md:flex-1 md:justify-start md:overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
          {links.map(({ to, label, icon: Icon, onboarding }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/studio'}
              data-onboarding={onboarding}
              className={({ isActive }) =>
                navLinkClass({
                  isActive:
                    to === '/studio'
                      ? isDashboardNavActive(location.pathname, isActive)
                      : isActive,
                })
              }
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2.25} />
              <span className="nav-link-label hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </div>
        {dashboardActions && (
          <div className="flex items-center justify-end gap-1.5 border-t border-nav-border px-3 py-2 sm:gap-2 md:border-l md:border-t-0 md:px-4 md:py-0 md:shrink-0">
            {dashboardActions}
          </div>
        )}
      </nav>
    </>
  )
}
