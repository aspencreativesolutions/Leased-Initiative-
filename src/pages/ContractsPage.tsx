import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  Columns3,
  FileText,
  LayoutGrid,
  LayoutList,
  MapPinned,
  Plus,
  Trash2,
} from 'lucide-react'
import { AddressMapModal } from '@/components/contracts/AddressMapModal'
import {
  ContractTable,
  type ContractSortColumn,
  type ContractTableRow,
} from '@/components/contracts/ContractTable'
import { DeleteContractModal } from '@/components/contracts/DeleteContractModal'
import { EditRegionsModal } from '@/components/contracts/EditRegionsModal'
import { LeaseTileTimeline } from '@/components/contracts/LeaseTileTimeline'
import { NewLeaseStyleBanner } from '@/components/contracts/NewLeaseStyleBanner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/FormField'
import { AddressText } from '@/components/ui/AddressText'
import { MobileTileColumnsControl } from '@/components/ui/MobileTileColumnsControl'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { isMappableAddress } from '@/lib/addressMap'
import {
  applyLeaseAgreementStyle,
  dismissLeaseStyleReplacePrompt,
} from '@/lib/leaseAgreementTemplatesApi'
import {
  getLeaseAgreementBadgeLabel,
  getLeaseAgreementBadgeRank,
  getLeaseAgreementProgressFilterLabel,
  getLeaseAgreementStatusFilterLabel,
  getLeaseAgreementStatusHoverDetail,
  LEASE_AGREEMENT_PROGRESS_FILTER_BUTTON_WIDTH_CLASS,
  leaseProgressMatchesFilter,
  nextLeaseAgreementProgressFilter,
  nextLeaseAgreementStatusFilter,
  type LeaseAgreementProgressFilter,
  type LeaseAgreementStatusFilter,
  getLeaseTermProgress,
} from '@/lib/clientUtils'
import {
  loadContractVisibleColumns,
  saveContractVisibleColumns,
  type ContractTableColumnId,
} from '@/lib/contractTableColumns'
import { monthsBetweenLeaseDates } from '@/lib/leaseSchedule'
import { getTenantAssignedProperty } from '@/lib/officialTenantLocationDisplay'
import { cn } from '@/lib/utils'
import {
  contractMatchesLocationFilter,
  getContractLocationMeta,
  uniqueSorted,
  type ContractLocationFilterKind,
} from '@/lib/contractLocationFilters'
import {
  sectionTileGridClassName,
  useMobileTileColumns,
} from '@/lib/mobileTileColumns'
import {
  getRentalStateFilterLabel,
  nextOptionalLocationFilter,
  RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS,
  RENTAL_STATE_FILTER_ANY_LABEL,
  RENTAL_STATE_FILTER_CYCLE_MAX,
  shouldCycleLocationFilter,
} from '@/lib/rentalDisplaySort'
import {
  LEASE_TILE_SCALE_DEFAULT,
  leaseTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import { useIsMobileViewport } from '@/lib/useMediaQuery'

const CONTRACTS_VIEW_KEY = 'contracts-view-mode'
const CONTRACTS_TILE_SCALE_KEY = 'contracts-tile-scale'

const LEASE_AGREEMENTS_HELP =
  'Track lease status, term progress, and ending urgency across all tenants.'

type ContractsViewMode = 'tile' | 'spreadsheet'

function readViewModePreference(): ContractsViewMode {
  try {
    return localStorage.getItem(CONTRACTS_VIEW_KEY) === 'spreadsheet'
      ? 'spreadsheet'
      : 'tile'
  } catch {
    return 'tile'
  }
}

const LOCATION_FILTER_OPTIONS: {
  id: Exclude<ContractLocationFilterKind, 'state'>
  label: string
}[] = [
  { id: 'areaCode', label: 'Area Code' },
  { id: 'region', label: 'Group' },
]

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

/** Chevron used by the State cycle button and select (same placement as Rentals). */
const locationFilterChevronClass = [
  'bg-no-repeat bg-[length:0.55rem_0.55rem] bg-[position:right_0.45rem_center]',
  'bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
].join(' ')

/**
 * Shared State filter chrome — identical width, height, padding, radius, type,
 * arrow, hover, and active styling for cycle buttons and selects (mirrors Rentals).
 */
const locationFilterControlClass = [
  'h-9 min-w-0 shrink-0 border-2 py-0 pl-3 pr-7 text-left',
  'rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-caps text-ink',
  'shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] transition-colors',
  locationFilterChevronClass,
  RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS,
].join(' ')

function locationFilterToneClass(active: boolean): string {
  return active
    ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
    : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
}

export function ContractsPage() {
  const { clients, contracts, properties, settings, refresh, updateSettings } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [preselectedId, setPreselectedId] = useState<string | undefined>()
  const [filterKind, setFilterKind] = useState<Exclude<
    ContractLocationFilterKind,
    'state'
  > | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaseAgreementStatusFilter | null>(
    null
  )
  const [progressFilter, setProgressFilter] =
    useState<LeaseAgreementProgressFilter | null>(null)
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<{ address: string; tenantName: string } | null>(
    null
  )
  const [viewMode, setViewMode] = useState<ContractsViewMode>(readViewModePreference)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<ContractTableColumnId[]>(
    loadContractVisibleColumns
  )
  const [tableSortColumn, setTableSortColumn] = useState<ContractSortColumn>('tenant')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [styleSelecting, setStyleSelecting] = useState(false)
  const [selectedStyleContractIds, setSelectedStyleContractIds] = useState<string[]>([])
  const [styleBusy, setStyleBusy] = useState(false)
  const [styleError, setStyleError] = useState('')
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const { scale, setScale, factor } = useTileScale(
    CONTRACTS_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )
  const isMobile = useIsMobileViewport()
  const effectiveViewMode: ContractsViewMode = isMobile ? 'tile' : viewMode

  const stylePrompt = settings.leaseStyleReplacePrompt
  const showStyleBanner =
    Boolean(stylePrompt) &&
    stylePrompt?.showOnContracts !== false &&
    !stylePrompt?.dismissedAt

  const dismissStyleBanner = async () => {
    setStyleSelecting(false)
    setSelectedStyleContractIds([])
    try {
      const { settings: next } = await dismissLeaseStyleReplacePrompt({ contracts: true })
      updateSettings({ leaseStyleReplacePrompt: next.leaseStyleReplacePrompt ?? null })
    } catch {
      updateSettings({
        leaseStyleReplacePrompt: stylePrompt
          ? { ...stylePrompt, showOnContracts: false }
          : null,
      })
    }
  }

  const applyOfficialStyle = async (mode: 'all' | 'selected') => {
    setStyleBusy(true)
    setStyleError('')
    try {
      // Server apply + refresh only — avoid updateSettings persist of stale contracts.
      await applyLeaseAgreementStyle(
        mode === 'all'
          ? {
              scope: 'official',
              templateId: stylePrompt?.templateId || settings.defaultLeaseTemplateId,
            }
          : {
              scope: 'selected',
              templateId: stylePrompt?.templateId || settings.defaultLeaseTemplateId,
              contractIds: selectedStyleContractIds,
              surface: 'contracts',
            }
      )
      await refresh()
      setStyleSelecting(false)
      setSelectedStyleContractIds([])
    } catch (err) {
      setStyleError(err instanceof ApiError ? err.message : 'Could not apply lease style')
    } finally {
      setStyleBusy(false)
    }
  }

  const toggleStyleContract = (contractId: string) => {
    setSelectedStyleContractIds((prev) =>
      prev.includes(contractId) ? prev.filter((id) => id !== contractId) : [...prev, contractId]
    )
  }

  useEffect(() => {
    try {
      localStorage.setItem(CONTRACTS_VIEW_KEY, viewMode)
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
    saveContractVisibleColumns(visibleColumns)
  }, [visibleColumns])

  const regions = settings.contractRegions ?? []

  const contractOptions = useMemo(
    () =>
      contracts.map((contract) => {
        const client = clients.find((c) => c.id === contract.clientId)
        const location = getContractLocationMeta(client, contract)
        const property = client
          ? getTenantAssignedProperty(client, contract, properties)
          : undefined
        const progress = client
          ? getLeaseTermProgress(client, contract)
          : {
              startDate: contract.startDate?.slice(0, 10),
              endDate: contract.completionDate?.slice(0, 10),
              percentComplete: null as number | null,
              daysElapsed: null as number | null,
              daysRemaining: null as number | null,
              totalDays: null as number | null,
              showEndingAlert: false,
              state: undefined,
            }
        return {
          contract,
          client,
          clientName: location.tenantName,
          businessName: client?.businessName ?? contract.businessName,
          address: location.address,
          areaCode: location.areaCode,
          state: location.state,
          lat: property?.addressDetails?.lat ?? null,
          lng: property?.addressDetails?.lng ?? null,
          propertyId: property?.id ?? null,
          progress,
        }
      }),
    [clients, contracts, properties]
  )

  const areaCodeOptions = useMemo(
    () => uniqueSorted(contractOptions.map((o) => o.areaCode)),
    [contractOptions]
  )
  const stateOptions = useMemo(
    () => uniqueSorted(contractOptions.map((o) => o.state)),
    [contractOptions]
  )

  const valueOptions = useMemo(() => {
    if (filterKind === 'areaCode') {
      return areaCodeOptions.map((code) => ({ value: code, label: code }))
    }
    if (filterKind === 'region') {
      return regions.map((region) => ({ value: region.id, label: region.name }))
    }
    return []
  }, [filterKind, areaCodeOptions, regions])

  const cycleState = shouldCycleLocationFilter(
    stateOptions.length,
    RENTAL_STATE_FILTER_CYCLE_MAX
  )

  const filteredOptions = useMemo(() => {
    return contractOptions.filter((option) => {
      if (stateFilter && option.state !== stateFilter) {
        return false
      }

      if (
        !contractMatchesLocationFilter(
          {
            areaCode: option.areaCode,
            state: option.state,
            lat: option.lat,
            lng: option.lng,
            propertyId: option.propertyId,
          },
          { kind: filterKind, value: filterValue },
          regions
        )
      ) {
        return false
      }

      if (statusFilter) {
        const label = option.client
          ? getLeaseAgreementBadgeLabel(option.client, option.contract)
          : null
        if (label !== statusFilter) return false
      }

      if (!leaseProgressMatchesFilter(option.progress, progressFilter)) {
        return false
      }

      return true
    })
  }, [
    contractOptions,
    filterKind,
    filterValue,
    regions,
    statusFilter,
    progressFilter,
    stateFilter,
  ])

  const tableRows: ContractTableRow[] = useMemo(() => {
    const rows = filteredOptions.map(({ contract, client, clientName, address, progress }) => {
      const statusLabel = client
        ? getLeaseAgreementBadgeLabel(client, contract)
        : null
      const statusHoverDetail =
        client && statusLabel
          ? getLeaseAgreementStatusHoverDetail(statusLabel, client, contract)
          : undefined
      const durationMonths =
        client?.leaseLengthMonths && client.leaseLengthMonths > 0
          ? client.leaseLengthMonths
          : progress.startDate && progress.endDate
            ? monthsBetweenLeaseDates(progress.startDate, progress.endDate)
            : null
      return {
        id: contract.id,
        clientId: contract.clientId,
        tenantName: clientName,
        address,
        status: client?.contractStatus ?? null,
        statusLabel,
        statusHoverDetail,
        startDate: progress.startDate,
        endDate: progress.endDate,
        durationMonths,
        progress,
      }
    })

    const dir = tableSortDirection === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const cmp = (() => {
        switch (tableSortColumn) {
          case 'tenant':
            return a.tenantName.localeCompare(b.tenantName)
          case 'address':
            return a.address.localeCompare(b.address)
          case 'status': {
            const aRank = a.statusLabel
              ? getLeaseAgreementBadgeRank(a.statusLabel)
              : 99
            const bRank = b.statusLabel
              ? getLeaseAgreementBadgeRank(b.statusLabel)
              : 99
            return aRank - bRank
          }
          case 'duration': {
            const aMonths = a.durationMonths ?? -1
            const bMonths = b.durationMonths ?? -1
            if (aMonths !== bMonths) return aMonths - bMonths
            // Tie-break by start date so equal-length leases stay ordered stably.
            return (a.startDate ?? '').localeCompare(b.startDate ?? '')
          }
          case 'progress':
            return (a.progress.percentComplete ?? -1) - (b.progress.percentComplete ?? -1)
          default:
            return 0
        }
      })()
      return cmp * dir
    })
  }, [filteredOptions, tableSortColumn, tableSortDirection])

  const selectFilterKind = (kind: Exclude<ContractLocationFilterKind, 'state'>) => {
    if (filterKind === kind) {
      setFilterKind(null)
      setFilterValue('')
      return
    }
    setFilterKind(kind)
    setFilterValue('')
  }

  const cycleStatusFilter = () => {
    setStatusFilter((current) => nextLeaseAgreementStatusFilter(current))
  }

  const cycleProgressFilter = () => {
    setProgressFilter((current) => nextLeaseAgreementProgressFilter(current))
  }

  const cycleStateFilter = () => {
    setStateFilter((current) => nextOptionalLocationFilter(current, stateOptions))
  }

  const handleTableSortChange = (column: ContractSortColumn) => {
    if (tableSortColumn === column) {
      setTableSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setTableSortColumn(column)
    setTableSortDirection('asc')
  }

  useEffect(() => {
    if (visibleColumns.includes(tableSortColumn)) return
    const fallback = visibleColumns[0]
    if (!fallback) return
    setTableSortColumn(fallback)
    setTableSortDirection('asc')
  }, [visibleColumns, tableSortColumn])

  useEffect(() => {
    if (!filterKind || !filterValue) return
    const stillValid = valueOptions.some((opt) => opt.value === filterValue)
    if (!stillValid) setFilterValue('')
  }, [filterKind, filterValue, valueOptions])

  useEffect(() => {
    if (!stateFilter) return
    if (!stateOptions.includes(stateFilter)) setStateFilter('')
  }, [stateFilter, stateOptions])

  const filtersActive =
    statusFilter !== null ||
    progressFilter !== null ||
    Boolean(stateFilter) ||
    filterKind !== null
  const filterButtonLabel = statusFilter ?? progressFilter ?? 'Filter'
  const locationFilterLabel = stateFilter
    ? getRentalStateFilterLabel(stateFilter)
    : filterKind
      ? LOCATION_FILTER_OPTIONS.find((o) => o.id === filterKind)?.label
      : null
  const stateFilterLabel = getRentalStateFilterLabel(stateFilter)

  const displaySettings =
    contracts.length > 0 ? (
      <Card className="w-fit max-w-full !px-3 !py-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Display Settings
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterBarOpen((open) => !open)}
              aria-expanded={filterBarOpen}
              aria-controls="contracts-filter-options"
              aria-label={
                statusFilter || progressFilter
                  ? `Filter: ${[statusFilter, progressFilter].filter(Boolean).join(', ')}. Open to change lease filters.`
                  : 'Filter lease agreements by status or progress'
              }
              title={
                statusFilter || progressFilter
                  ? `Filtered to ${[statusFilter, progressFilter].filter(Boolean).join(' · ')}`
                  : 'Filter by lease status or progress'
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
              {!statusFilter && !progressFilter && locationFilterLabel ? (
                <span className="normal-case tracking-normal text-ink-muted">
                  · {locationFilterLabel}
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

            <div
              role="group"
              aria-label="Lease agreements display"
              className="hidden h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] md:inline-flex"
            >
              <button
                type="button"
                title="Tile View"
                aria-label="Tile View"
                aria-pressed={viewMode === 'tile'}
                onClick={() => setViewMode('tile')}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors',
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
                  'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors',
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

            {isMobile ? (
              <MobileTileColumnsControl
                value={mobileTileColumns}
                onChange={setMobileTileColumns}
              />
            ) : null}

            {effectiveViewMode === 'tile' && !isMobile ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Lease tile size"
              />
            ) : null}
          </div>

          {filterBarOpen ? (
            <div
              id="contracts-filter-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Lease Status
                  </p>
                  <button
                    type="button"
                    onClick={cycleStatusFilter}
                    aria-label={`Lease status filter: ${getLeaseAgreementStatusFilterLabel(statusFilter)}. Click to cycle Any, Signed, Sent.`}
                    title="Click to cycle lease status: Any → Signed → Sent"
                    className={cn(
                      filterButtonClass,
                      'w-[6rem] shrink-0 justify-center',
                      statusFilter
                        ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                        : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                    )}
                  >
                    {getLeaseAgreementStatusFilterLabel(statusFilter)}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Lease Progress
                  </p>
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
                </div>
              </div>

              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Location
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {cycleState ? (
                  <button
                    type="button"
                    onClick={cycleStateFilter}
                    aria-label={`State filter: ${stateFilterLabel}. Click to cycle available states.`}
                    title={
                      stateFilter
                        ? stateFilterLabel
                        : stateOptions.length > 0
                          ? `Click to cycle: ${RENTAL_STATE_FILTER_ANY_LABEL} → ${stateOptions.join(' → ')}`
                          : RENTAL_STATE_FILTER_ANY_LABEL
                    }
                    className={cn(
                      locationFilterControlClass,
                      'inline-flex items-center',
                      locationFilterToneClass(Boolean(stateFilter))
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{stateFilterLabel}</span>
                  </button>
                ) : (
                  <select
                    aria-label="State filter"
                    title={stateFilterLabel}
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className={cn(
                      locationFilterControlClass,
                      'appearance-none truncate focus:outline-none focus:ring-1 focus:ring-brand',
                      locationFilterToneClass(Boolean(stateFilter))
                    )}
                  >
                    <option value="">{RENTAL_STATE_FILTER_ANY_LABEL}</option>
                    {stateOptions.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                )}

                {LOCATION_FILTER_OPTIONS.map(({ id, label }) => {
                  const isActive = filterKind === id
                  const optionButton = (
                    <button
                      type="button"
                      onClick={() => selectFilterKind(id)}
                      aria-pressed={isActive}
                      className={cn(
                        filterButtonClass,
                        isActive
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {label}
                    </button>
                  )

                  if (id === 'region') {
                    return (
                      <div
                        key={id}
                        className="inline-flex flex-wrap items-center gap-2"
                      >
                        {optionButton}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => setRegionsOpen(true)}
                        >
                          <MapPinned className="h-4 w-4" />
                          <Plus className="h-3.5 w-3.5" />
                          Edit Groups
                        </Button>
                      </div>
                    )
                  }

                  return <Fragment key={id}>{optionButton}</Fragment>
                })}

                {filterKind && (
                  <Select
                    label=""
                    aria-label={
                      filterKind === 'areaCode' ? 'Area code' : 'Group'
                    }
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-[9.5rem] shrink-0 [&_select]:h-9 [&_select]:py-0"
                  >
                    <option value="">
                      {filterKind === 'region' && regions.length === 0
                        ? 'No groups yet'
                        : valueOptions.length === 0
                          ? 'No options'
                          : 'All'}
                    </option>
                    {valueOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          ) : null}

          {(statusFilter ||
            progressFilter ||
            stateFilter ||
            (filterKind && filterValue)) && (
            <p className="text-xs text-ink-faint">
              Showing {filteredOptions.length} of {contractOptions.length} leases
            </p>
          )}
        </div>
      </Card>
    ) : undefined

  return (
    <div className="w-full min-w-0" data-onboarding="admin-contracts">
      <PageHeader
        title="Lease Agreements"
        help={LEASE_AGREEMENTS_HELP}
        below={displaySettings}
      />

      {showStyleBanner && stylePrompt ? (
        <NewLeaseStyleBanner
          className="mb-4"
          variant="contracts"
          templateName={stylePrompt.templateName}
          selecting={styleSelecting}
          selectedCount={selectedStyleContractIds.length}
          busy={styleBusy}
          onReplaceAll={() => void applyOfficialStyle('all')}
          onReplaceSelect={() => {
            setStyleSelecting(true)
            setSelectedStyleContractIds([])
            if (effectiveViewMode !== 'tile') setViewMode('tile')
          }}
          onApplySelected={() => void applyOfficialStyle('selected')}
          onCancel={() => {
            if (styleSelecting) {
              setStyleSelecting(false)
              setSelectedStyleContractIds([])
              return
            }
            void dismissStyleBanner()
          }}
        />
      ) : null}

      {styleError ? (
        <p className="mb-4 text-sm font-semibold text-accent" role="alert">
          {styleError}
        </p>
      ) : null}

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No lease agreements in progress"
          description="Start a lease from any tenant profile to see it here."
        />
      ) : filteredOptions.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No lease agreements match this filter"
          description="Try another lease status, progress (Any, Not Started, Ongoing, or Ending Soon), state, area code, or group."
        />
      ) : effectiveViewMode === 'spreadsheet' ? (
        <ContractTable
          rows={tableRows}
          sortColumn={tableSortColumn}
          sortDirection={tableSortDirection}
          onSortChange={handleTableSortChange}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          arrangeColumns={arrangeColumns}
          onArrangeDone={() => setArrangeColumns(false)}
          onDelete={(contractId) => {
            setPreselectedId(contractId)
            setDeleteOpen(true)
          }}
        />
      ) : (
        <div
          className="tile-scale-root"
          style={leaseTileScaleStyle(factor)}
        >
          <div className={sectionTileGridClassName(mobileTileColumns)}>
            {filteredOptions.map(({ contract, client, clientName, address, progress }) => {
              const canMap = isMappableAddress(address)
              const statusLabel = client
                ? getLeaseAgreementBadgeLabel(client, contract)
                : null
              const statusHoverDetail =
                client && statusLabel
                  ? getLeaseAgreementStatusHoverDetail(statusLabel, client, contract)
                  : undefined

              return (
                <Card
                  key={contract.id}
                  padding="none"
                  className={cn(
                    'tile-card lease-tile-card',
                    styleSelecting &&
                      selectedStyleContractIds.includes(contract.id) &&
                      'ring-2 ring-brand'
                  )}
                >
                  <div className="lease-tile-card__body">
                    <div className="lease-tile-card__content">
                      <div className="lease-tile-card__top">
                        {styleSelecting ? (
                          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
                            <input
                              type="checkbox"
                              checked={selectedStyleContractIds.includes(contract.id)}
                              onChange={() => toggleStyleContract(contract.id)}
                              className="h-4 w-4"
                            />
                            Select for new style
                          </label>
                        ) : null}
                        <div className="lease-tile-card__icon" aria-hidden>
                          <FileText strokeWidth={1.75} />
                        </div>

                        <p className="tile-card__body font-semibold text-ink">{clientName}</p>

                        {client && statusLabel ? (
                          <div className="lease-tile-card__status">
                            <StatusBadge
                              type="contract"
                              status={
                                statusLabel === 'Signed' || statusLabel === 'Sent'
                                  ? statusLabel
                                  : client.contractStatus
                              }
                              label={statusLabel}
                              hoverDetail={statusHoverDetail}
                            />
                          </div>
                        ) : null}

                        {canMap ? (
                          <button
                            type="button"
                            className="tile-card__title tile-card__address"
                            title={`View map for ${address}`}
                            onClick={() => setMapTarget({ address, tenantName: clientName })}
                          >
                            <AddressText address={address} hangingIndent={false} />
                          </button>
                        ) : (
                          <h3 className="tile-card__title tile-card__address-static">
                            <AddressText address={address} hangingIndent={false} />
                          </h3>
                        )}
                      </div>

                      <LeaseTileTimeline progress={progress} />
                    </div>

                    <div className="lease-tile-card__actions">
                      <Link
                        to={`/studio/clients/${contract.clientId}/contract`}
                        className="lease-tile-card__action-item"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="lease-tile-card__action-btn !px-2.5 !py-1.5 !text-[length:var(--tile-meta)]"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          Open
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="lease-tile-card__action-item lease-tile-card__action-btn !px-2.5 !py-1.5 !text-[length:var(--tile-meta)] !text-accent"
                        onClick={() => {
                          setPreselectedId(contract.id)
                          setDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <DeleteContractModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        contracts={contractOptions}
        preselectedContractId={preselectedId}
        onDeleted={() => void refresh()}
      />

      <EditRegionsModal open={regionsOpen} onClose={() => setRegionsOpen(false)} />

      <AddressMapModal
        open={mapTarget != null}
        onClose={() => setMapTarget(null)}
        address={mapTarget?.address ?? null}
        tenantName={mapTarget?.tenantName}
      />
    </div>
  )
}
