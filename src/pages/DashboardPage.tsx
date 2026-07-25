import { useEffect, useMemo, useRef, useState } from 'react'
import { Columns3, Plus, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { OfficialTenantsSortControls } from '@/components/clients/OfficialTenantsSortControls'
import { TenantDetailsModal } from '@/components/clients/TenantDetailsModal'
import { TenantPipelineSections } from '@/components/clients/TenantPipelineSections'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MobileTileColumnsControl } from '@/components/ui/MobileTileColumnsControl'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import { shouldShowInOfficialTenants } from '@/lib/clientUtils'
import { useMobileTileColumns } from '@/lib/mobileTileColumns'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import {
  sortOfficialTenants,
  type OfficialTenantAddressFocus,
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
  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<TenantTableColumnId[]>(loadTenantTableColumnOrder)
  const [addressFocus, setAddressFocus] = useState<OfficialTenantAddressFocus>({ kind: 'all' })
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const isMobile = useIsMobileViewport()
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
        { mode: 'address', focus: addressFocus },
        { properties, locationDisplayMode: 'address' }
      ),
    [
      officialClients,
      getContractForClient,
      regions,
      addressFocus,
      properties,
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
          {registrationsError}.{' '}
          {import.meta.env.PROD
            ? 'Sign out and sign back in (or re-enter your demo code) to refresh your session.'
            : (
              <>
                Try restarting the app with{' '}
                <code className="text-xs">npm run desktop:stop && npm run desktop</code>.
              </>
            )}
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
            help="Tenants with signed leases that are active or starting soon"
            action={
              officialClients.length > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  {isMobile ? (
                    <MobileTileColumnsControl
                      value={mobileTileColumns}
                      onChange={setMobileTileColumns}
                    />
                  ) : null}
                  <OfficialTenantsSortControls
                    clients={officialClients}
                    getContractForClient={getContractForClient}
                    regions={regions}
                    properties={properties}
                    addressFocus={addressFocus}
                    onAddressFocusChange={setAddressFocus}
                  />
                  {!arrangeColumns && !isMobile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setArrangeColumns(true)}
                      aria-pressed={false}
                      title="Edit Columns"
                      aria-label="Edit Columns"
                    >
                      <Columns3 className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Edit Columns</span>
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
              arrangeColumns={arrangeColumns && !isMobile}
              onArrangeDone={() => setArrangeColumns(false)}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              mobileTileColumns={mobileTileColumns}
              onMobileTileColumnsChange={setMobileTileColumns}
              onOpenTenantDetails={setDetailsTenantId}
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
      <TenantDetailsModal
        tenantId={detailsTenantId}
        open={Boolean(detailsTenantId)}
        onClose={() => setDetailsTenantId(null)}
        onSelectTenant={setDetailsTenantId}
      />
    </div>
  )
}
