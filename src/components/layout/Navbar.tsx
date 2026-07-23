import { useCallback, useState } from 'react'
import { LayoutDashboard, FileText, Settings, DollarSign, LogOut, UserCircle, Bell, Building2 } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { SendInviteModal } from '@/components/clients/SendInviteModal'
import { DashboardNavActions } from '@/components/dashboard/DashboardNavActions'
import { NewRegistrationsModal } from '@/components/dashboard/NewRegistrationsModal'
import { OnboardingRestartButton } from '@/components/onboarding/OnboardingTour'
import { CreativeStudiosBrand } from '@/components/brand/CreativeStudiosBrand'
import { Button } from '@/components/ui/Button'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import { useTenantAlerts } from '@/hooks/useTenantAlerts'
import { exitPublicDemo } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

const links = [
  { to: '/studio', label: 'Dashboard', icon: LayoutDashboard, onboarding: 'admin-dashboard' },
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

export function Navbar({ onStartTour }: { onStartTour?: () => void }) {
  const { user, logout, isPublicDemo } = useAuth()
  const { refresh } = useApp()
  const navigate = useNavigate()
  const { unreadCount: unreadAlertCount } = useTenantAlerts()
  const { count: registrationCount, registrations, refresh: refreshRegistrations } =
    usePendingRegistrations()
  const { markRead, refresh: refreshNotifications } = useAdminNotifications()
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [registrationsOpen, setRegistrationsOpen] = useState(false)

  const handleRegistrationAdded = useCallback(() => {
    refreshRegistrations()
    refreshNotifications()
    refresh()
  }, [refreshRegistrations, refreshNotifications, refresh])

  return (
    <>
      <div className="w-full max-w-full border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-10 xl:px-12">
          <NavLink to="/studio" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <CreativeStudiosBrand />
          </NavLink>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NavLink
              to="/studio/settings"
              data-onboarding="admin-settings"
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 transition-colors',
                  isActive
                    ? 'border-nav-active text-nav-fg'
                    : 'border-nav-fg/30 text-nav-fg-muted hover:border-nav-fg hover:text-nav-fg'
                )
              }
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </NavLink>
            <OnboardingRestartButton role="admin" onStart={() => onStartTour?.()} />
            {user && (
              <NavLink
                to="/studio/profile"
                data-onboarding="admin-profile"
                className={({ isActive }) =>
                  cn(
                    'hidden items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-[10px] font-semibold transition-colors lg:flex',
                    isActive
                      ? 'border-nav-active text-nav-fg'
                      : 'border-nav-fg/30 text-nav-fg-muted hover:border-nav-fg hover:text-nav-fg'
                  )
                }
                title="Company profile"
              >
                <UserCircle className="h-3.5 w-3.5" />
                {user.name}
              </NavLink>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isPublicDemo) {
                  void (async () => {
                    logout()
                    await exitPublicDemo()
                    navigate('/', { replace: true })
                  })()
                  return
                }
                logout()
              }}
              className="!border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <nav
        className="sticky top-0 z-50 flex w-full max-w-full flex-col border-b-[length:var(--border-width)] border-nav-border bg-nav text-nav-fg md:flex-row md:items-stretch md:justify-between md:gap-4 md:px-6 lg:gap-6 lg:px-10 xl:px-12"
        aria-label="Main navigation"
      >
        <div className="grid w-full grid-cols-5 items-stretch md:flex md:min-w-0 md:flex-1 md:justify-evenly [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
          {links.map(({ to, label, icon: Icon, onboarding }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/studio'}
              data-onboarding={onboarding}
              className={({ isActive }) =>
                cn(navLinkClass({ isActive }), 'md:flex-1 md:justify-center')
              }
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={2.25} />
              <span className="nav-link-label hidden md:inline">{label}</span>
              {to === '/studio/alerts' && unreadAlertCount > 0 ? (
                <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                  {unreadAlertCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-nav-border/60 px-4 py-1.5 md:border-t-0 md:border-l md:border-nav-border/60 md:py-0 md:pl-4 lg:pl-5">
          <DashboardNavActions
            variant="nav"
            registrationCount={registrationCount}
            onOpenRegistrations={() => setRegistrationsOpen(true)}
            onOpenAddClient={() => setAddOpen(true)}
            onOpenSendInvite={() => setInviteOpen(true)}
          />
        </div>
      </nav>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SendInviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <NewRegistrationsModal
        open={registrationsOpen}
        onClose={() => setRegistrationsOpen(false)}
        registrations={registrations}
        onRefresh={handleRegistrationAdded}
        onListRefresh={refreshRegistrations}
        onMarkNotificationsRead={() => markRead({ type: 'registration' })}
      />
    </>
  )
}
