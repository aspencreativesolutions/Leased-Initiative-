import { useEffect, useMemo, useRef, useState } from 'react'
import { Columns3, Plus, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
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

export function DashboardPage() {
  const { clients, refresh, getContractForClient, settings, properties } = useApp()
  const location = useLocation()
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

  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.slice(1)
    if (!targetId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, clients.length])

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
                    properties={properties}
                    sortMode={sortMode}
                    addressFocus={addressFocus}
                    onSortModeChange={setSortMode}
                    onAddressFocusChange={setAddressFocus}
                  />
                  {!arrangeColumns ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setArrangeColumns(true)}
                      aria-pressed={false}
                      title="Rearrange Columns"
                      aria-label="Rearrange Columns"
                    >
                      <Columns3 className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Rearrange Columns</span>
                    </Button>
                  ) : null}
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
              onArrangeDone={() => setArrangeColumns(false)}
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
