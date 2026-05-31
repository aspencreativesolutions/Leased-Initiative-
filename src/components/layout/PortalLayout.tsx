import { NavLink, Outlet } from 'react-router-dom'
import { FileText, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function PortalNavbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
      <div className="flex h-[4.25rem] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <NavLink to="/portal" className="group flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center border-[length:var(--border-width)] border-nav-fg/80 bg-transparent font-display text-lg font-bold tracking-tight transition-colors group-hover:border-nav-active group-hover:text-nav-active">
            CC
          </div>
          <div className="leading-none">
            <span className="block font-display text-xl font-semibold tracking-tight">
              Client Craft
            </span>
            <span className="label-caps mt-1 block !text-nav-fg-muted">Client Portal</span>
          </div>
        </NavLink>

        <nav className="flex items-center gap-4">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              cn(
                'hidden sm:flex items-center gap-2 text-[11px] font-semibold transition-colors',
                isActive ? 'text-nav-fg' : 'text-nav-fg-muted hover:text-nav-fg'
              )
            }
          >
            <FileText className="h-3.5 w-3.5" />
            My Contracts
          </NavLink>
          {user && (
            <span className="hidden text-[11px] text-nav-fg-muted md:inline">
              {user.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="!border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  )
}

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <PortalNavbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Need help? Contact your designer for assistance with your account.
      </footer>
    </div>
  )
}
