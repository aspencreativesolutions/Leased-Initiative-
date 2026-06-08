import { useCallback, useEffect, useRef, useState } from 'react'
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
import { countOfficialClients, countPendingClients } from '@/lib/clientUtils'

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
  const prevNotificationCount = useRef(0)

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
        title="Client Dashboard"
        subtitle="Manage your clients, contracts, and follow-ups in one place."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setRegistrationsOpen(true)}>
              <UserPlus className="h-4 w-4" />
              View New Registers
              {(count > 0 || notificationCount > 0) && (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {Math.max(count, notificationCount)}
                </span>
              )}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
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

      <SummaryCards clients={clients} />

      <TimelineSkipNotesFeed />

      {registrationsError && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {registrationsError}. Try restarting the app with{' '}
          <code className="text-xs">npm run desktop:stop && npm run desktop</code>.
        </p>
      )}

      <div className="w-full min-w-0 space-y-6">
        <Card className="w-full min-w-0">
          <CardHeader
            title="Clients & Pending"
            subtitle={`${countOfficialClients(clients)} clients · ${countPendingClients(clients)} pending`}
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
          ) : (
            <ClientTable clients={clients} fullWidth />
          )}
        </Card>

        <div className="w-full min-w-0">
          <UpcomingDeadlines clients={clients} />
        </div>
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
