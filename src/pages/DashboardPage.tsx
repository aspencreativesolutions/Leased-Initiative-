import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, UserPlus } from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { AdminNotificationBanner } from '@/components/dashboard/AdminNotificationBanner'
import { NewRegistrationsModal } from '@/components/dashboard/NewRegistrationsModal'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { TimelineSkipNotesFeed } from '@/components/dashboard/TimelineSkipNotesFeed'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import {
  DASHBOARD_FILTER_LABELS,
  dashboardFilterShowsClients,
  dashboardFilterShowsDeadlines,
  dashboardFilterShowsTimelineNotes,
  filterClientsForDashboard,
  type DashboardFilter,
} from '@/lib/dashboardFilters'

export function DashboardPage() {
  const navigate = useNavigate()
  const { clients, refresh } = useApp()
  const { count, registrations, refresh: refreshRegistrations, error: registrationsError } =
    usePendingRegistrations()
  const {
    notifications,
    count: notificationCount,
    markRead,
    refresh: refreshNotifications,
  } = useAdminNotifications()
  const [addOpen, setAddOpen] = useState(false)
  const [registrationsOpen, setRegistrationsOpen] = useState(false)
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter | null>(null)
  const prevNotificationCount = useRef(0)

  const filteredClients = useMemo(
    () => filterClientsForDashboard(clients, dashboardFilter),
    [clients, dashboardFilter]
  )

  const showClientsSection = dashboardFilterShowsClients(dashboardFilter)
  const showDeadlinesSection = dashboardFilterShowsDeadlines(dashboardFilter)
  const showTimelineNotes = dashboardFilterShowsTimelineNotes(dashboardFilter)

  useEffect(() => {
    if (notificationCount > prevNotificationCount.current) {
      refresh()
    }
    prevNotificationCount.current = notificationCount
  }, [notificationCount, refresh])

  const handleViewPaymentClient = useCallback(
    async (clientId: string, notificationId: string) => {
      await markRead({ ids: [notificationId] })
      navigate(`/clients/${clientId}`)
    },
    [markRead, navigate]
  )

  const handleRegistrationAdded = useCallback(() => {
    refreshRegistrations()
    refreshNotifications()
    refresh()
  }, [refreshRegistrations, refreshNotifications, refresh])

  return (
    <div className="w-full min-w-0">
      <PageHeader
        compact
        title="Client Dashboard"
        action={
          <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 gap-1 px-2 py-1 text-[10px] sm:flex-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px] [&_svg]:size-3.5 sm:[&_svg]:size-4"
              onClick={() => setRegistrationsOpen(true)}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">Registers</span>
              <span className="hidden sm:inline">View New Registers</span>
              {count > 0 && (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="min-w-0 flex-1 gap-1 px-2 py-1 text-[10px] sm:flex-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px] [&_svg]:size-3.5 sm:[&_svg]:size-4"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Client
            </Button>
          </div>
        }
      />

      <AdminNotificationBanner
        notifications={notifications}
        onViewRegistrations={() => setRegistrationsOpen(true)}
        onViewClient={handleViewPaymentClient}
        onDismiss={() => markRead()}
      />

      <SummaryCards
        clients={clients}
        activeFilter={dashboardFilter}
        onFilterChange={setDashboardFilter}
      />

      {registrationsError && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {registrationsError}. Try restarting the app with{' '}
          <code className="text-xs">npm run desktop:stop && npm run desktop</code>.
        </p>
      )}

      <div className="w-full min-w-0 space-y-6">
        {showClientsSection && (
          <Card className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] p-3 sm:p-5">
            <CardHeader
              dense
              title={dashboardFilter ? DASHBOARD_FILTER_LABELS[dashboardFilter] : 'Clients & Pending'}
              subtitle={
                dashboardFilter
                  ? `Showing ${filteredClients.length} matching ${filteredClients.length === 1 ? 'item' : 'items'}`
                  : `${filteredClients.filter((c) => c.isOfficialClient).length} clients · ${filteredClients.filter((c) => !c.isOfficialClient).length} pending`
              }
            />
            {clients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No clients yet"
                description="Add your first client to start tracking projects and contracts."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Client
                  </Button>
                }
              />
            ) : filteredClients.length === 0 ? (
              <EmptyState
                icon={Users}
                title={`No ${dashboardFilter ? DASHBOARD_FILTER_LABELS[dashboardFilter].toLowerCase() : 'matching clients'}`}
                description="Try another filter or clear the selection."
                action={
                  <Button variant="outline" onClick={() => setDashboardFilter(null)}>
                    Show all
                  </Button>
                }
              />
            ) : (
              <ClientTable clients={filteredClients} />
            )}
          </Card>
        )}

        {showDeadlinesSection && (
          <div className="w-full min-w-0">
            <UpcomingDeadlines clients={filteredClients} />
          </div>
        )}

        {showTimelineNotes && <TimelineSkipNotesFeed />}
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
      <NewRegistrationsModal
        open={registrationsOpen}
        onClose={() => setRegistrationsOpen(false)}
        registrations={registrations}
        onRefresh={handleRegistrationAdded}
        onListRefresh={refreshRegistrations}
        onMarkNotificationsRead={() => markRead({ type: 'registration' })}
      />
    </div>
  )
}
