import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Columns3, Plus, Users } from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { AdminNotificationBanner } from '@/components/dashboard/AdminNotificationBanner'
import { DashboardNavActions } from '@/components/dashboard/DashboardNavActions'
import { DashboardSectionTabs } from '@/components/dashboard/DashboardSectionTabs'
import { NewRegistrationsModal } from '@/components/dashboard/NewRegistrationsModal'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { TimelineSkipNotesFeed } from '@/components/dashboard/TimelineSkipNotesFeed'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { useTenantAlerts } from '@/hooks/useTenantAlerts'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { useDashboardNavActions } from '@/context/DashboardNavActionsContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import {
  countMatchingDashboardFilter,
  DASHBOARD_FILTER_LABELS,
  dashboardFilterShowsClients,
  dashboardFilterShowsDeadlines,
  dashboardFilterShowsTimelineNotes,
  type DashboardFilter,
} from '@/lib/dashboardFilters'
import {
  loadTenantTableColumnOrder,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const navigate = useNavigate()
  const { clients, refresh } = useApp()
  const { setActions } = useDashboardNavActions()
  const { count, registrations, refresh: refreshRegistrations, error: registrationsError } =
    usePendingRegistrations()
  const {
    notifications,
    count: notificationCount,
    markRead,
    refresh: refreshNotifications,
  } = useAdminNotifications()
  const { unreadCount: unreadAlertCount } = useTenantAlerts()
  const [addOpen, setAddOpen] = useState(false)
  const [registrationsOpen, setRegistrationsOpen] = useState(false)
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter | null>(null)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<TenantTableColumnId[]>(loadTenantTableColumnOrder)
  const prevNotificationCount = useRef(0)

  const highlightedCount = useMemo(
    () => countMatchingDashboardFilter(clients, dashboardFilter),
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
      navigate(`/studio/clients/${clientId}`)
    },
    [markRead, navigate]
  )

  const handleRegistrationAdded = useCallback(() => {
    refreshRegistrations()
    refreshNotifications()
    refresh()
  }, [refreshRegistrations, refreshNotifications, refresh])

  const openRegistrations = useCallback(() => setRegistrationsOpen(true), [])
  const openAddClient = useCallback(() => setAddOpen(true), [])

  useEffect(() => {
    setActions(
      <DashboardNavActions
        registrationCount={count}
        onOpenRegistrations={openRegistrations}
        onOpenAddClient={openAddClient}
      />
    )
    return () => setActions(null)
  }, [count, openAddClient, openRegistrations, setActions])

  return (
    <div className="w-full min-w-0" data-onboarding="admin-dashboard">
      {notifications.length > 0 && (
        <AdminNotificationBanner
          notifications={notifications}
          onViewRegistrations={() => setRegistrationsOpen(true)}
          onViewClient={handleViewPaymentClient}
          onDismiss={() => markRead()}
        />
      )}

      {registrationsError && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {registrationsError}. Try restarting the app with{' '}
          <code className="text-xs">npm run desktop:stop && npm run desktop</code>.
        </p>
      )}

      <div className="w-full min-w-0 space-y-6">
        <DashboardSectionTabs alertCount={unreadAlertCount} />

        <Card className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] p-3 sm:p-5">
          <CardHeader
            dense
            title={dashboardFilter ? DASHBOARD_FILTER_LABELS[dashboardFilter] : 'Tenants & Pending'}
            subtitle={
              dashboardFilter
                ? `Highlighting ${highlightedCount} matching ${highlightedCount === 1 ? 'tenant' : 'tenants'} in the full list`
                : undefined
            }
            action={
              clients.length > 0 || dashboardFilter ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {clients.length > 0 && (
                    <Button
                      type="button"
                      variant={arrangeColumns ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setArrangeColumns((open) => !open)}
                      aria-pressed={arrangeColumns}
                      title={
                        arrangeColumns
                          ? 'Done arranging columns'
                          : 'Edit column arrangement'
                      }
                      aria-label={
                        arrangeColumns
                          ? 'Done arranging columns'
                          : 'Edit column arrangement'
                      }
                      className={cn(arrangeColumns && 'shadow-sm')}
                    >
                      {arrangeColumns ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Columns3 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      <span className="hidden sm:inline">
                        {arrangeColumns ? 'Done' : 'Edit Column Arrangement'}
                      </span>
                    </Button>
                  )}
                  {dashboardFilter ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDashboardFilter(null)}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                      Back
                    </Button>
                  ) : null}
                </div>
              ) : undefined
            }
          >
            <SummaryCards
              embedded
              clients={clients}
              activeFilter={dashboardFilter}
              onFilterChange={setDashboardFilter}
            />
          </CardHeader>
          {showClientsSection &&
            (clients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No tenants yet"
                description="Add your first tenant to start tracking leases."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Tenant
                  </Button>
                }
              />
            ) : (
              <ClientTable
                clients={clients}
                highlightFilter={dashboardFilter}
                arrangeColumns={arrangeColumns}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
              />
            ))}
        </Card>

        {(showDeadlinesSection || showTimelineNotes) && (
          <div
            className={
              showDeadlinesSection && showTimelineNotes
                ? 'grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:items-start'
                : 'w-full min-w-0'
            }
          >
            {showDeadlinesSection && <UpcomingDeadlines clients={clients} />}
            {showTimelineNotes && <TimelineSkipNotesFeed />}
          </div>
        )}
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
