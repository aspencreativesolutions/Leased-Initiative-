import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Columns3,
  LayoutGrid,
  LayoutList,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { SendInviteModal } from '@/components/clients/SendInviteModal'
import { TenantDetailsModal } from '@/components/clients/TenantDetailsModal'
import { TenantPipelineSections } from '@/components/clients/TenantPipelineSections'
import { DashboardNavActions } from '@/components/dashboard/DashboardNavActions'
import { NewRegistrationsModal } from '@/components/dashboard/NewRegistrationsModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MobileTileColumnsControl } from '@/components/ui/MobileTileColumnsControl'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import {
  getLeaseAgreementProgressFilterLabel,
  getLeaseTermProgress,
  LEASE_AGREEMENT_PROGRESS_FILTER_BUTTON_WIDTH_CLASS,
  LEASE_AGREEMENT_PROGRESS_FILTERS,
  leaseProgressMatchesFilter,
  nextLeaseAgreementProgressFilter,
  shouldShowInOfficialTenants,
  shouldShowLeaseCompleteTenant,
  type LeaseAgreementProgressFilter,
} from '@/lib/clientUtils'
import { performLiveUpdateRefresh } from '@/lib/liveUpdate'
import { useMobileTileColumns } from '@/lib/mobileTileColumns'
import {
  getOccupancyShareDetail,
  getTenantTypeFilterLabel,
  nextTenantTypeFilter,
  resolveArrangementTenantLabel,
  TENANT_TYPE_FILTER_BUTTON_WIDTH_CLASS,
  TENANT_TYPE_FILTER_OPTIONS,
  tenantTypeMatchesFilter,
  type TenantTypeFilter,
} from '@/lib/occupancyStatusFilter'
import { getTenantAssignedProperty } from '@/lib/officialTenantLocationDisplay'
import {
  OFFICIAL_TENANT_SPOTLIGHT_MS,
  parseOfficialTenantHighlightParam,
  readOfficialTenantSpotlightIds,
  scrollOfficialTenantIntoView,
  writeOfficialTenantSpotlightIds,
} from '@/lib/officialTenantSpotlight'
import {
  getRentalTypeFilterLabel,
  nextRentalTypeFilter,
  RENTAL_TYPE_DISPLAY_FILTERS,
  RENTAL_TYPE_FILTER_BUTTON_WIDTH_CLASS,
  rentalTypeFilterButtonLabel,
  type RentalTypeDisplayFilter,
} from '@/lib/rentalDisplaySort'
import { normalizeRentalType } from '@/lib/rentalTypes'
import {
  OFFICIAL_TENANTS_TILE_SCALE_DEFAULT,
  useTileScale,
} from '@/lib/tileScale'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import { sortOfficialTenants } from '@/lib/officialTenantSort'
import {
  loadTenantTableColumnOrder,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import type { PropertyHousingType } from '@/types'
import { cn } from '@/lib/utils'

const DASHBOARD_VIEW_KEY = 'dashboard-view-mode'
const DASHBOARD_TILE_SCALE_KEY = 'dashboard-official-tenants-tile-scale-v2'
const DASHBOARD_OCCUPANCY_STATUS_KEY = 'dashboard-show-occupancy-status'

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

/** Occupancy tags under tenant names — off until the landlord opts in. */
function readShowOccupancyStatus(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_OCCUPANCY_STATUS_KEY) === 'true'
  } catch {
    return false
  }
}

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

const segmentedShellClass =
  'inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

const segmentedSegmentClass =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors'

/** Coarse client `projectType` → housing type when no assigned rental exists. */
function buildingTypeFromProjectType(projectType: string): PropertyHousingType {
  switch (projectType) {
    case 'Apartment':
      return 'Apartment'
    case 'Condo':
      return 'Condominium (Condo)'
    case 'Townhouse':
      return 'Townhouse'
    case 'Duplex':
      return 'Duplex'
    case 'House':
      return 'Single-Family Home'
    default:
      return normalizeRentalType(projectType)
  }
}

export function DashboardPage() {
  const { clients, refresh, getContractForClient, settings, properties, syncing } = useApp()
  const { loading: authLoading } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    count: registrationCount,
    registrations,
    error: registrationsError,
    refresh: refreshRegistrations,
  } = usePendingRegistrations()
  const {
    count: notificationCount,
    markRead,
    refresh: refreshNotifications,
  } = useAdminNotifications()
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [registrationsOpen, setRegistrationsOpen] = useState(false)
  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<DashboardViewMode>(readViewModePreference)
  const [showOccupancyStatus, setShowOccupancyStatus] = useState(readShowOccupancyStatus)
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [progressFilter, setProgressFilter] =
    useState<LeaseAgreementProgressFilter | null>(null)
  const [buildingTypeFilter, setBuildingTypeFilter] =
    useState<RentalTypeDisplayFilter | null>(null)
  const [tenantTypeFilter, setTenantTypeFilter] =
    useState<TenantTypeFilter | null>(null)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<TenantTableColumnId[]>(loadTenantTableColumnOrder)
  const [refreshingDevChanges, setRefreshingDevChanges] = useState(false)
  /** Hide the banner for the current error until it clears, then allow a new cycle. */
  const [devChangesDismissedError, setDevChangesDismissedError] = useState<string | null>(
    null
  )
  const [spotlightIds, setSpotlightIds] = useState<string[]>(() =>
    readOfficialTenantSpotlightIds()
  )
  const [activeSpotlightIds, setActiveSpotlightIds] = useState<ReadonlySet<string> | null>(null)
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const { scale, setScale, factor } = useTileScale(
    DASHBOARD_TILE_SCALE_KEY,
    OFFICIAL_TENANTS_TILE_SCALE_DEFAULT
  )
  const isMobile = useIsMobileViewport()
  const effectiveViewMode: DashboardViewMode = isMobile ? 'tile' : viewMode
  const prevNotificationCount = useRef(0)
  const spotlightClearRef = useRef<number | null>(null)

  const regions = settings.contractRegions ?? []

  const officialClients = useMemo(
    () =>
      clients.filter((c) => {
        const contract = getContractForClient(c.id)
        return (
          shouldShowInOfficialTenants(c, contract) ||
          shouldShowLeaseCompleteTenant(c, contract)
        )
      }),
    [clients, getContractForClient]
  )

  const sortedOfficialClients = useMemo(
    () =>
      sortOfficialTenants(
        officialClients,
        getContractForClient,
        regions,
        { mode: 'address', focus: { kind: 'all' } },
        { properties, locationDisplayMode: 'address' }
      ),
    [officialClients, getContractForClient, regions, properties]
  )

  const tableClients = useMemo(() => {
    if (!progressFilter && !buildingTypeFilter && !tenantTypeFilter) {
      return sortedOfficialClients
    }

    return sortedOfficialClients.filter((client) => {
      const contract = getContractForClient(client.id)

      if (progressFilter) {
        const progress = getLeaseTermProgress(client, contract)
        if (!leaseProgressMatchesFilter(progress, progressFilter)) return false
      }

      if (buildingTypeFilter) {
        const property = getTenantAssignedProperty(client, contract, properties)
        const buildingType = property
          ? property.propertyType
          : buildingTypeFromProjectType(client.projectType)
        if (buildingType !== buildingTypeFilter) return false
      }

      if (tenantTypeFilter) {
        const shareDetail = getOccupancyShareDetail(
          client,
          clients,
          getContractForClient,
          properties
        )
        const label = resolveArrangementTenantLabel(shareDetail)
        if (!tenantTypeMatchesFilter(label, tenantTypeFilter)) return false
      }

      return true
    })
  }, [
    sortedOfficialClients,
    progressFilter,
    buildingTypeFilter,
    tenantTypeFilter,
    getContractForClient,
    properties,
    clients,
  ])

  const filtersActive =
    progressFilter !== null ||
    buildingTypeFilter !== null ||
    tenantTypeFilter !== null
  const filterButtonLabel =
    progressFilter ??
    (tenantTypeFilter
      ? getTenantTypeFilterLabel(tenantTypeFilter)
      : buildingTypeFilter
        ? rentalTypeFilterButtonLabel(buildingTypeFilter)
        : 'Filter')

  const cycleProgressFilter = () => {
    setProgressFilter((current) => nextLeaseAgreementProgressFilter(current))
  }

  const cycleTenantTypeFilter = () => {
    setTenantTypeFilter((current) => nextTenantTypeFilter(current))
  }

  const cycleBuildingTypeFilter = () => {
    setBuildingTypeFilter((current) => nextRentalTypeFilter(current))
  }

  const scrollToDashboardSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleRegistrationAdded = useCallback(() => {
    refreshRegistrations()
    refreshNotifications()
    refresh()
  }, [refreshRegistrations, refreshNotifications, refresh])

  const runSpotlight = (ids: string[]) => {
    const present = ids.filter((id) => tableClients.some((c) => c.id === id))
    if (present.length === 0) return
    writeOfficialTenantSpotlightIds(present)
    setSpotlightIds(present)
    if (spotlightClearRef.current != null) {
      window.clearTimeout(spotlightClearRef.current)
    }
    setActiveSpotlightIds(new Set(present))
    window.requestAnimationFrame(() => {
      scrollOfficialTenantIntoView(present[0])
    })
    spotlightClearRef.current = window.setTimeout(() => {
      setActiveSpotlightIds(null)
      spotlightClearRef.current = null
    }, OFFICIAL_TENANT_SPOTLIGHT_MS)
  }

  const highlightParam = searchParams.get('highlight')?.trim() || ''

  useEffect(() => {
    if (!highlightParam) return
    const ids = parseOfficialTenantHighlightParam(highlightParam)
    if (ids.length === 0) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true }
      )
      return
    }

    const present = ids.filter((id) => tableClients.some((c) => c.id === id))
    if (present.length === 0) {
      // Clients may still be syncing after lease import — wait for them.
      if (syncing || authLoading) return
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true }
      )
      return
    }

    writeOfficialTenantSpotlightIds(present)
    setSpotlightIds(present)
    if (spotlightClearRef.current != null) {
      window.clearTimeout(spotlightClearRef.current)
    }
    setActiveSpotlightIds(new Set(present))
    const frame = window.requestAnimationFrame(() => {
      scrollOfficialTenantIntoView(present[0])
    })
    const clearHighlight = window.setTimeout(() => {
      setActiveSpotlightIds(null)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true }
      )
      spotlightClearRef.current = null
    }, OFFICIAL_TENANT_SPOTLIGHT_MS)
    spotlightClearRef.current = clearHighlight

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(clearHighlight)
    }
  }, [
    highlightParam,
    tableClients,
    syncing,
    authLoading,
    setSearchParams,
  ])

  useEffect(() => {
    return () => {
      if (spotlightClearRef.current != null) {
        window.clearTimeout(spotlightClearRef.current)
      }
    }
  }, [])

  const canRehighlight =
    spotlightIds.length > 0 &&
    spotlightIds.some((id) => tableClients.some((c) => c.id === id))

  const handleRehighlight = () => {
    const present = spotlightIds.filter((id) => tableClients.some((c) => c.id === id))
    if (present.length === 0) return
    runSpotlight(present)
  }

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
    try {
      localStorage.setItem(
        DASHBOARD_OCCUPANCY_STATUS_KEY,
        showOccupancyStatus ? 'true' : 'false'
      )
    } catch {
      /* ignore quota / private mode */
    }
  }, [showOccupancyStatus])

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
    if (!registrationsError) {
      setDevChangesDismissedError(null)
    }
  }, [registrationsError])

  const showDevChangesBanner =
    Boolean(registrationsError) &&
    registrationsError !== devChangesDismissedError &&
    !refreshingDevChanges

  const handleDevChangesRefresh = () => {
    if (refreshingDevChanges) return
    setRefreshingDevChanges(true)
    if (registrationsError) setDevChangesDismissedError(registrationsError)
    void performLiveUpdateRefresh().catch(() => {
      // API still down — allow another click; keep banner if error persists.
      setDevChangesDismissedError(null)
      setRefreshingDevChanges(false)
    })
  }

  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.slice(1)
    if (!targetId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, clients.length])

  const displaySettings =
    officialClients.length > 0 ? (
      <Card className="w-full max-w-full !px-3 !py-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Display Settings
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterBarOpen((open) => !open)}
              aria-expanded={filterBarOpen}
              aria-controls="tenants-filter-options"
              aria-label={
                progressFilter || buildingTypeFilter || tenantTypeFilter
                  ? `Filter: ${[
                      progressFilter,
                      tenantTypeFilter
                        ? getTenantTypeFilterLabel(tenantTypeFilter)
                        : null,
                      buildingTypeFilter
                        ? rentalTypeFilterButtonLabel(buildingTypeFilter)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}. Open to change tenant filters.`
                  : 'Filter official tenants by lease progress, tenant type, or building type'
              }
              title={
                progressFilter || buildingTypeFilter || tenantTypeFilter
                  ? `Filtered to ${[
                      progressFilter,
                      tenantTypeFilter
                        ? getTenantTypeFilterLabel(tenantTypeFilter)
                        : null,
                      buildingTypeFilter
                        ? rentalTypeFilterButtonLabel(buildingTypeFilter)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}`
                  : 'Filter by lease progress, tenant type, or building type'
              }
              className={cn(
                filterButtonClass,
                'gap-1.5',
                filterBarOpen || filtersActive
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              {filterButtonLabel}
              {progressFilter && buildingTypeFilter ? (
                <span className="max-w-[9rem] truncate normal-case tracking-normal text-ink-muted">
                  · {rentalTypeFilterButtonLabel(buildingTypeFilter)}
                </span>
              ) : null}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform',
                  filterBarOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>

            {isMobile ? (
              <MobileTileColumnsControl
                value={mobileTileColumns}
                onChange={setMobileTileColumns}
              />
            ) : null}

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
              <button
                type="button"
                onClick={() => setArrangeColumns(true)}
                aria-pressed={false}
                title="Edit Columns"
                aria-label="Edit Columns"
                className={cn(
                  filterButtonClass,
                  'hidden gap-1.5 md:inline-flex',
                  'border-ink bg-surface-paper text-ink hover:border-brand/50'
                )}
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Edit Columns</span>
              </button>
            ) : null}

            <button
              type="button"
              role="switch"
              aria-checked={showOccupancyStatus}
              aria-label="Show Arrangements"
              title="Show Arrangements — adds an Arrangement column beside Tenant: Sole Tenant or Co-Tenant with room details (e.g. Entire Home, Open to Roommates); expand bedrooms for numbered occupants with rent status dots"
              onClick={() => setShowOccupancyStatus((value) => !value)}
              className={cn(
                filterButtonClass,
                'gap-2',
                showOccupancyStatus
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              <span
                className={cn(
                  'relative h-4 w-7 shrink-0 rounded-full border transition-colors',
                  showOccupancyStatus
                    ? 'border-brand bg-brand'
                    : 'border-line bg-surface'
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all',
                    showOccupancyStatus ? 'left-[0.85rem]' : 'left-0.5'
                  )}
                />
              </span>
              <span className="whitespace-nowrap">Show Arrangements</span>
            </button>

            {effectiveViewMode === 'tile' && !isMobile ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Tenant tile size"
              />
            ) : null}
          </div>

          {filterBarOpen ? (
            <div
              id="tenants-filter-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <p
                    className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint"
                    aria-label={`${LEASE_AGREEMENT_PROGRESS_FILTERS.length} lease progress options`}
                  >
                    {LEASE_AGREEMENT_PROGRESS_FILTERS.length} Lease Progress
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cycleProgressFilter}
                      aria-label={`Lease progress filter: ${getLeaseAgreementProgressFilterLabel(progressFilter)}. Click to cycle Any, Not Started, Ongoing, Ending Soon, Finished.`}
                      title="Click to cycle lease progress: Any → Not Started → Ongoing → Ending Soon → Finished"
                      className={cn(
                        filterButtonClass,
                        LEASE_AGREEMENT_PROGRESS_FILTER_BUTTON_WIDTH_CLASS,
                        'shrink-0 justify-center',
                        progressFilter
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {getLeaseAgreementProgressFilterLabel(progressFilter)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgressFilter(null)}
                      disabled={!progressFilter}
                      aria-label="Reset lease progress filter"
                      title="Reset Filters"
                      className={cn(
                        filterButtonClass,
                        'shrink-0',
                        progressFilter
                          ? 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                          : 'cursor-not-allowed border-ink/40 bg-surface text-ink-faint'
                      )}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p
                    className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint"
                    aria-label={`${TENANT_TYPE_FILTER_OPTIONS.length} tenant type options`}
                  >
                    {TENANT_TYPE_FILTER_OPTIONS.length} Tenant Type
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cycleTenantTypeFilter}
                      aria-label={`Tenant type filter: ${getTenantTypeFilterLabel(tenantTypeFilter)}. Click to cycle Any, Sole Tenant, Co-Tenant.`}
                      title="Click to cycle tenant type: Any → Sole Tenant → Co-Tenant"
                      className={cn(
                        filterButtonClass,
                        TENANT_TYPE_FILTER_BUTTON_WIDTH_CLASS,
                        'shrink-0 justify-center',
                        tenantTypeFilter
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {getTenantTypeFilterLabel(tenantTypeFilter)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantTypeFilter(null)}
                      disabled={!tenantTypeFilter}
                      aria-label="Reset tenant type filter"
                      title="Reset Filters"
                      className={cn(
                        filterButtonClass,
                        'shrink-0',
                        tenantTypeFilter
                          ? 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                          : 'cursor-not-allowed border-ink/40 bg-surface text-ink-faint'
                      )}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p
                    className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint"
                    aria-label={`${RENTAL_TYPE_DISPLAY_FILTERS.length} building type options`}
                  >
                    {RENTAL_TYPE_DISPLAY_FILTERS.length} Building Type
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cycleBuildingTypeFilter}
                      aria-label={`Building type filter: ${getRentalTypeFilterLabel(buildingTypeFilter)}. Click to cycle Any, Apartment, Single-Family Home, Townhouse, Duplex.`}
                      title="Click to cycle building type: Any → Apartment → Single-Family Home → Townhouse → Duplex"
                      className={cn(
                        filterButtonClass,
                        RENTAL_TYPE_FILTER_BUTTON_WIDTH_CLASS,
                        'shrink-0 justify-center',
                        buildingTypeFilter
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {getRentalTypeFilterLabel(buildingTypeFilter)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuildingTypeFilter(null)}
                      disabled={!buildingTypeFilter}
                      aria-label="Reset building type filter"
                      title="Reset Filters"
                      className={cn(
                        filterButtonClass,
                        'shrink-0',
                        buildingTypeFilter
                          ? 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                          : 'cursor-not-allowed border-ink/40 bg-surface text-ink-faint'
                      )}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {filtersActive ? (
            <p className="text-xs text-ink-faint">
              Showing {tableClients.length} of {sortedOfficialClients.length}{' '}
              tenants
            </p>
          ) : null}
        </div>
      </Card>
    ) : undefined

  return (
    <div className="w-full min-w-0" data-onboarding="admin-dashboard">
      {showDevChangesBanner && (
        <p
          className="mb-4 rounded-sm border border-line bg-surface-paper px-3 py-2 text-sm text-ink"
          role="status"
        >
          Developer changes made… refresh page.
          <button
            type="button"
            className="ml-2 font-semibold text-brand underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
            disabled={refreshingDevChanges}
            onClick={handleDevChangesRefresh}
          >
            Refresh
          </button>
        </p>
      )}
      {refreshingDevChanges ? (
        <p
          className="mb-4 rounded-sm border border-line bg-surface-paper px-3 py-2 text-sm text-ink-muted"
          role="status"
        >
          Refreshing… staying on this page.
        </p>
      ) : null}

      <div className="w-full min-w-0 space-y-6">
        <div className="w-full min-w-0" data-onboarding="admin-official-tenants">
          <PageHeader
            title="Official Tenants"
            help="Tenants with signed leases that are active, starting soon, or lease-complete (until you archive or delete them) — including those added from lease import"
            titleAside={
              isMobile ? (
                <nav
                  className="flex min-w-0 flex-wrap items-center gap-1.5"
                  aria-label="Jump to waiting sections"
                >
                  <button
                    type="button"
                    onClick={() => scrollToDashboardSection('tenants-waiting-connect')}
                    className={cn(
                      'inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-ink/20 bg-surface-paper px-2',
                      'text-[9px] font-semibold uppercase tracking-caps text-ink-muted',
                      'transition-colors hover:border-brand/40 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/45'
                    )}
                  >
                    Waiting to Connect
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToDashboardSection('dashboard-pending-tenants-list')
                    }
                    className={cn(
                      'inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-ink/20 bg-surface-paper px-2',
                      'text-[9px] font-semibold uppercase tracking-caps text-ink-muted',
                      'transition-colors hover:border-brand/40 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/45'
                    )}
                  >
                    Pending Clients
                  </button>
                </nav>
              ) : null
            }
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <DashboardNavActions
                  registrationCount={registrationCount}
                  onOpenRegistrations={() => setRegistrationsOpen(true)}
                  onOpenAddClient={() => setAddOpen(true)}
                  onOpenSendInvite={() => setInviteOpen(true)}
                />
                {canRehighlight ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRehighlight}
                    title="Highlight the tenants from your last lease import"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Highlight last import
                  </Button>
                ) : null}
              </div>
            }
            below={displaySettings}
            noBorder
          />

          {tableClients.length === 0 ? (
            authLoading || syncing ? (
              <EmptyState
                icon={Users}
                loading
                title="Loading tenants…"
                description="Fetching your official tenants."
              />
            ) : filtersActive ? (
              <EmptyState
                icon={Users}
                title="No tenants match these filters"
                description="Try a different Lease Progress, Tenant Type, or Building Type, or use Reset Filters in Display Settings."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProgressFilter(null)
                      setBuildingTypeFilter(null)
                      setTenantTypeFilter(null)
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No official tenants yet"
                description="Approve sign-ups under Waiting to Connect, send a lease from Pending Tenants, or import existing leases in Company Profile & Preferences and Add to Official Tenants."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Tenant
                  </Button>
                }
              />
            )
          ) : (
            <ClientTable
              clients={tableClients}
              highlightedIds={activeSpotlightIds}
              viewMode={effectiveViewMode}
              arrangeColumns={arrangeColumns && effectiveViewMode === 'spreadsheet'}
              onArrangeDone={() => setArrangeColumns(false)}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              mobileTileColumns={mobileTileColumns}
              onMobileTileColumnsChange={setMobileTileColumns}
              tileScaleFactor={effectiveViewMode === 'tile' ? factor : undefined}
              showOccupancyStatus={showOccupancyStatus}
              onOpenTenantDetails={setDetailsTenantId}
            />
          )}
        </div>

        <div data-onboarding="dashboard-pending-tenants" className="w-full min-w-0">
          <TenantPipelineSections
            pendingSectionTitle="Pending Tenants"
            pendingSectionId="dashboard-pending-tenants-list"
          />
        </div>
      </div>

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
      <TenantDetailsModal
        tenantId={detailsTenantId}
        open={Boolean(detailsTenantId)}
        onClose={() => setDetailsTenantId(null)}
        onSelectTenant={setDetailsTenantId}
      />
    </div>
  )
}
