import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Columns3, Plus, Users } from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { OfficialTenantsSortControls } from '@/components/clients/OfficialTenantsSortControls'
import { TenantPipelineSections } from '@/components/clients/TenantPipelineSections'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import { shouldShowInOfficialTenants } from '@/lib/clientUtils'
import {
  loadOfficialTenantLocationDisplayMode,
  saveOfficialTenantLocationDisplayMode,
  type OfficialTenantLocationDisplayMode,
} from '@/lib/officialTenantLocationDisplay'
import {
  sortOfficialTenants,
  type OfficialTenantAddressFocus,
  type OfficialTenantSortMode,
} from '@/lib/officialTenantSort'
import {
  loadTenantTableColumnOrder,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { clients, refresh, getContractForClient, settings, properties } = useApp()
  const { error: registrationsError } = usePendingRegistrations()
  const { count: notificationCount } = useAdminNotifications()
  const [addOpen, setAddOpen] = useState(false)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<TenantTableColumnId[]>(loadTenantTableColumnOrder)
  const [sortMode, setSortMode] = useState<OfficialTenantSortMode>('officialDate')
  const [addressFocus, setAddressFocus] = useState<OfficialTenantAddressFocus>({ kind: 'all' })
  const [locationDisplayMode, setLocationDisplayMode] = useState<OfficialTenantLocationDisplayMode>(
    loadOfficialTenantLocationDisplayMode
  )
  const prevNotificationCount = useRef(0)

  const regions = settings.contractRegions ?? []

  const officialClients = useMemo(
    () =>
      clients.filter((c) => shouldShowInOfficialTenants(c, getContractForClient(c.id))),
    [clients, getContractForClient]
  )

  const tableClients = useMemo(
    () =>
      sortOfficialTenants(
        officialClients,
        getContractForClient,
        regions,
        sortMode === 'officialDate'
          ? { mode: 'officialDate' }
          : { mode: 'address', focus: addressFocus },
        { properties, locationDisplayMode }
      ),
    [
      officialClients,
      getContractForClient,
      regions,
      sortMode,
      addressFocus,
      properties,
      locationDisplayMode,
    ]
  )

  useEffect(() => {
    if (notificationCount > prevNotificationCount.current) {
      refresh()
    }
    prevNotificationCount.current = notificationCount
  }, [notificationCount, refresh])

  return (
    <div className="w-full min-w-0" data-onboarding="admin-dashboard">
      {registrationsError && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {registrationsError}. Try restarting the app with{' '}
          <code className="text-xs">npm run desktop:stop && npm run desktop</code>.
        </p>
      )}

      <div className="w-full min-w-0 space-y-6">
        <Card
          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] p-3 sm:p-5"
          data-onboarding="admin-official-tenants"
        >
          <CardHeader
            dense
            title="Official Tenants"
            subtitle="Tenants with signed leases that are active or starting soon"
            action={
              officialClients.length > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <OfficialTenantsSortControls
                    clients={officialClients}
                    getContractForClient={getContractForClient}
                    regions={regions}
                    sortMode={sortMode}
                    addressFocus={addressFocus}
                    onSortModeChange={setSortMode}
                    onAddressFocusChange={setAddressFocus}
                  />
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
                </div>
              ) : undefined
            }
          />
          {tableClients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No official tenants yet"
              description="Approve sign-ups under Waiting to Connect, then send a lease from Pending Tenants. Once signed, they appear here."
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Tenant
                </Button>
              }
            />
          ) : (
            <ClientTable
              clients={tableClients}
              arrangeColumns={arrangeColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              locationDisplayMode={locationDisplayMode}
              onLocationDisplayModeChange={(mode) => {
                saveOfficialTenantLocationDisplayMode(mode)
                setLocationDisplayMode(mode)
              }}
            />
          )}
        </Card>

        <Card className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] p-3 sm:p-5">
          <div data-onboarding="dashboard-pending-tenants">
            <TenantPipelineSections
              pendingSectionTitle="Pending Tenants"
              pendingSectionId="dashboard-pending-tenants-list"
            />
          </div>
        </Card>
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
