import { LayoutDashboard, Users, UserPlus, FileText, Calendar, Settings, CalendarClock, LogOut, ExternalLink, UserCircle } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppStyleButton } from '@/components/settings/AppStyleButton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: UserPlus },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarClock },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-2.5 text-[10px] font-semibold transition-colors md:justify-start md:gap-2 md:px-4 md:py-3 md:text-[11px]',
    isActive
      ? 'border-nav-active text-nav-fg'
      : 'border-transparent text-nav-fg-muted hover:border-nav-fg/25 hover:text-nav-fg'
  )

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <>
      <div className="w-full max-w-full border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10 xl:px-12">
          <NavLink to="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border-[length:var(--border-width)] border-nav-fg/80 bg-transparent font-display text-base font-bold tracking-tight transition-colors group-hover:border-nav-active group-hover:text-nav-active sm:h-10 sm:w-10 sm:text-lg">
              CC
            </div>
            <div className="flex flex-col leading-none">
              <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight sm:text-xl">
                Client Craft
              </span>
              <span className="mt-0.5 hidden whitespace-nowrap text-[10px] font-semibold tracking-wide text-nav-fg-muted sm:mt-1 sm:block">
                StudiOS
              </span>
            </div>
          </NavLink>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              to="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-nav-fg/30 px-2.5 py-1.5 text-[10px] font-semibold text-nav-fg-muted transition-colors hover:border-nav-fg hover:text-nav-fg"
              title="Client portal"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </Link>
            <AppStyleButton />
            {user && (
              <NavLink
                to="/profile"
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
        className="sticky top-0 z-50 grid w-full max-w-full grid-cols-8 items-stretch border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg md:flex md:justify-start md:overflow-x-auto md:px-6 lg:px-10 xl:px-12 [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
        aria-label="Main navigation"
      >
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={navLinkClass}
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2.25} />
            <span className="nav-link-label hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
