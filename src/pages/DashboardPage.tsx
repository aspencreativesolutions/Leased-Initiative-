import { useEffect, useMemo, useRef, useState } from 'react'
import { Columns3, LayoutGrid, LayoutList, Plus, Users } from 'lucide-react'
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
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import { shouldShowInOfficialTenants } from '@/lib/clientUtils'
import { useMobileTileColumns } from '@/lib/mobileTileColumns'
import {
  LEASE_TILE_SCALE_DEFAULT,
  useTileScale,
} from '@/lib/tileScale'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import {
  sortOfficialTenants,
  type OfficialTenantAddressFocus,
} from '@/lib/officialTenantSort'
import {
  loadTenantTableColumnOrder,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import { cn } from '@/lib/utils'

const DASHBOARD_VIEW_KEY = 'dashboard-view-mode'
const DASHBOARD_TILE_SCALE_KEY = 'dashboard-official-tenants-tile-scale'

type DashboardViewMode = 'tile' | 'spreadsheet'

/** Official Tenants / Dashboard default to spreadsheet on first visit. */
function readViewModePreference(): DashboardViewMode {
  try {
    return localStorage.getItem(DASHBOARD_VIEW_KEY) === 'tile'
      ? 'tile'
      : 'spreadsheet'
  } catch {
    return 'spreadsheet'
  }
}

const segmentedShellClass =
  'inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

const segmentedSegmentClass =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors'

export function DashboardPage() {
  const { clients, refresh, getContractForClient, settings, properties } = useApp()
  const location = useLocation()
  const { error: registrationsError } = usePendingRegistrations()
  const { count: notificationCount } = useAdminNotifications()
  const [addOpen, setAddOpen] = useState(false)
  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<DashboardViewMode>(readViewModePreference)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<TenantTableColumnId[]>(loadTenantTableColumnOrder)
  const [addressFocus, setAddressFocus] = useState<OfficialTenantAddressFocus>({ kind: 'all' })
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const { scale, setScale, factor } = useTileScale(
    DASHBOARD_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )
  const isMobile = useIsMobileViewport()
  const effectiveViewMode: DashboardViewMode = isMobile ? 'tile' : viewMode
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
    try {
      localStorage.setItem(DASHBOARD_VIEW_KEY, viewMode)
    } catch {
      /* ignore quota / private mode */
    }
    if (viewMode !== 'spreadsheet') {
      setArrangeColumns(false)
    }
  }, [viewMode])

  useEffect(() => {
    if (isMobile) setArrangeColumns(false)
  }, [isMobile])

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
                  {effectiveViewMode === 'tile' && !isMobile ? (
                    <TileScaleControl
                      variant="row"
                      value={scale}
                      onChange={setScale}
                      label="Tenant tile size"
                      className="min-w-[12.5rem] flex-none"
                    />
                  ) : null}
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
                  <div
                    role="group"
                    aria-label="Official Tenants display"
                    className={cn(segmentedShellClass, 'hidden md:inline-flex')}
                  >
                    <button
                      type="button"
                      title="Tile View"
                      aria-label="Tile View"
                      aria-pressed={viewMode === 'tile'}
                      onClick={() => setViewMode('tile')}
                      className={cn(
                        segmentedSegmentClass,
                        viewMode === 'tile'
                          ? 'bg-brand text-surface-paper'
                          : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Tile</span>
                    </button>
                    <button
                      type="button"
                      title="Spreadsheet View"
                      aria-label="Spreadsheet View"
                      aria-pressed={viewMode === 'spreadsheet'}
                      onClick={() => setViewMode('spreadsheet')}
                      className={cn(
                        segmentedSegmentClass,
                        viewMode === 'spreadsheet'
                          ? 'bg-brand text-surface-paper'
                          : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                      )}
                    >
                      <LayoutList className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Spreadsheet</span>
                    </button>
                  </div>
                  {effectiveViewMode === 'spreadsheet' && !arrangeColumns ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setArrangeColumns(true)}
                      aria-pressed={false}
                      title="Edit Columns"
                      aria-label="Edit Columns"
                      className="hidden md:inline-flex"
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
              viewMode={effectiveViewMode}
              arrangeColumns={arrangeColumns && effectiveViewMode === 'spreadsheet'}
              onArrangeDone={() => setArrangeColumns(false)}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              mobileTileColumns={mobileTileColumns}
              onMobileTileColumnsChange={setMobileTileColumns}
              tileScaleFactor={effectiveViewMode === 'tile' ? factor : undefined}
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
