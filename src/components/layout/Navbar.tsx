import { LayoutDashboard, Users, FileText, Calendar, Settings, CalendarClock, Palette, LogOut, ExternalLink } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/scheduler', label: 'Scheduler', icon: CalendarClock },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
      <div className="flex h-[4.25rem] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 xl:px-12">
        <NavLink to="/" className="group flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width)] border-nav-fg/80 bg-transparent font-display text-lg font-bold tracking-tight transition-colors group-hover:border-nav-active group-hover:text-nav-active">
            CC
          </div>
          <div className="leading-none">
            <span className="block font-display text-xl font-semibold tracking-tight">
              Client Craft
            </span>
            <span className="label-caps mt-1 block !text-nav-fg-muted">Studio OS</span>
          </div>
        </NavLink>

        <nav className="hidden items-stretch gap-0 md:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 border-b-2 px-4 py-4 text-[11px] font-semibold transition-colors',
                  isActive
                    ? 'border-nav-active text-nav-fg'
                    : 'border-transparent text-nav-fg-muted hover:border-nav-fg/25 hover:text-nav-fg'
                )
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className={cn('nav-link-label')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/portal/login"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-nav-fg/30 px-2.5 py-1.5 text-[10px] font-semibold text-nav-fg-muted transition-colors hover:border-nav-fg hover:text-nav-fg"
            title="Client portal"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Portal
          </Link>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'hidden sm:flex items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
                isActive
                  ? 'border-nav-active text-nav-fg'
                  : 'border-nav-fg/30 text-nav-fg-muted hover:border-nav-fg hover:text-nav-fg'
              )
            }
            title="App style"
          >
            <Palette className="h-3.5 w-3.5" />
            Style
          </NavLink>

          {user && (
            <span className="hidden text-[10px] text-nav-fg-muted lg:inline">{user.name}</span>
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

          <nav className="flex items-center gap-0 md:hidden overflow-x-auto">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-semibold',
                    isActive
                      ? 'border-nav-active text-nav-fg'
                      : 'border-transparent text-nav-fg-muted'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
