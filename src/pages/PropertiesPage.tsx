import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  Columns3,
  LayoutGrid,
  LayoutList,
  Pencil,
} from 'lucide-react'
import { EditRegionsModal } from '@/components/contracts/EditRegionsModal'
import {
  AddRentalButton,
  AddRentalModal,
} from '@/components/properties/AddPropertyModal'
import {
  PropertyTable,
  type PropertySortColumn,
  type PropertyTableRow,
} from '@/components/properties/PropertyTable'
import { BedsOccupancyTag } from '@/components/properties/BedsOccupancyTag'
import { RentalInterestCue } from '@/components/properties/RentalInterestCue'
import { RentalDetailModal } from '@/components/properties/RentalDetailModal'
import { TenantDetailsModal } from '@/components/clients/TenantDetailsModal'
import { UpcomingOpeningsPanel } from '@/components/dashboard/UpcomingOpeningsPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MobileTileColumnsControl } from '@/components/ui/MobileTileColumnsControl'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import {
  contractMatchesLocationFilter,
  getAddressCity,
  getAddressState,
  uniqueSorted,
  uniqueSortedInsensitive,
} from '@/lib/contractLocationFilters'
import {
  activeTenantsAtProperty,
  rentalBedOccupancyForProperty,
  rentalInterestByPropertyId,
  rentalOccupancyStatusLabel,
  rentalOccupancyTone,
} from '@/lib/properties'
import {
  findBedInLayout,
  formatBedAssignmentLabel,
} from '@/lib/rentalBeds'
import { buildRentalPricingSummary, formatUsd } from '@/lib/rentalRent'
import {
  getRentalGroupFilterLabel,
  getRentalStateFilterLabel,
  getRentalTownFilterLabel,
  nextOptionalLocationFilter,
  RENTAL_GROUP_FILTER_ANY_LABEL,
  RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS,
  RENTAL_GROUP_FILTER_CYCLE_MAX,
  RENTAL_LOCATION_FILTER_BUTTON_WIDTH_CLASS,
  RENTAL_STATE_FILTER_ANY_LABEL,
  RENTAL_STATE_FILTER_CYCLE_MAX,
  RENTAL_TOWN_FILTER_ANY_LABEL,
  RENTAL_TOWN_FILTER_CYCLE_MAX,
  shouldCycleLocationFilter,
  townsMatch,
} from '@/lib/rentalDisplaySort'
import {
  loadRentalVisibleColumns,
  saveRentalVisibleColumns,
  type RentalTableColumnId,
} from '@/lib/rentalTableColumns'
import {
  sectionTileGridClassName,
  useMobileTileColumns,
} from '@/lib/mobileTileColumns'
import {
  LEASE_TILE_SCALE_DEFAULT,
  leaseTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import { type Property } from '@/types'
import { cn } from '@/lib/utils'

const RENTALS_VIEW_KEY = 'rentals-view-mode'
const RENTALS_TILE_SCALE_KEY = 'rentals-tile-scale'

type RentalsViewMode = 'tile' | 'spreadsheet'

function readViewModePreference(): RentalsViewMode {
  try {
    return localStorage.getItem(RENTALS_VIEW_KEY) === 'spreadsheet'
      ? 'spreadsheet'
      : 'tile'
  } catch {
    return 'tile'
  }
}

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

/** Chevron used by State / Town cycle buttons and selects (same placement). */
const locationFilterChevronClass = [
  'bg-no-repeat bg-[length:0.55rem_0.55rem] bg-[position:right_0.45rem_center]',
  'bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
].join(' ')

/**
 * Shared State / Town filter chrome — identical width, height, padding,
 * radius, type, arrow, hover, and active styling for cycle buttons and selects.
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

const segmentedShellClass =
  'inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

const segmentedSegmentClass =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors'

function compareRows(
  a: PropertyTableRow,
  b: PropertyTableRow,
  column: PropertySortColumn,
  direction: 'asc' | 'desc'
): number {
  const dir = direction === 'asc' ? 1 : -1
  switch (column) {
    case 'address':
      return (
        a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }) * dir
      )
    case 'propertyType':
      return (
        a.propertyType.localeCompare(b.propertyType, undefined, {
          sensitivity: 'base',
        }) * dir
      )
    case 'bedrooms':
      return (a.bedrooms - b.bedrooms) * dir
    case 'maxTenants':
      return (a.maxTenants - b.maxTenants) * dir
    case 'currentTenants':
    case 'occupancy':
      return (a.currentTenants - b.currentTenants) * dir
    case 'openUnits':
      return (a.openUnits - b.openUnits) * dir
    case 'monthlyRent':
      return (a.monthlyRent - b.monthlyRent) * dir
    case 'tenantShare':
      return ((a.tenantShare ?? 0) - (b.tenantShare ?? 0)) * dir
  }
}

function propertyState(row: PropertyTableRow, property: Property | undefined): string | null {
  const fromDetails = property?.addressDetails?.state?.trim().toUpperCase()
  if (fromDetails) return fromDetails
  return getAddressState(row.address)
}

function propertyTown(row: PropertyTableRow, property: Property | undefined): string | null {
  const fromDetails = property?.addressDetails?.city?.trim()
  if (fromDetails) return fromDetails
  return getAddressCity(row.address)
}

export function PropertiesPage() {
  const { properties, clients, getContractForClient, settings } = useApp()
  const { registrations } = usePendingRegistrations()
  const [searchParams, setSearchParams] = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<Property | null>(null)
  const [detailsTenantId, setDetailsTenantId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [townFilter, setTownFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<PropertySortColumn>('address')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<RentalsViewMode>(readViewModePreference)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<RentalTableColumnId[]>(
    loadRentalVisibleColumns
  )
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const { scale, setScale, factor } = useTileScale(
    RENTALS_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )
  const isMobile = useIsMobileViewport()
  const effectiveViewMode: RentalsViewMode = isMobile ? 'tile' : viewMode
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const companyName = settings.businessName?.trim() || 'your company'
  const regions = settings.contractRegions ?? []
  const rentalsHelp = `Manage the rental portfolio for ${companyName}. Rentals here appear in tenant signup, invitations, leases, and Upcoming Openings. Select any rental to view property details, current tenants, lease information, occupancy, and related records.`

  useEffect(() => {
    try {
      localStorage.setItem(RENTALS_VIEW_KEY, viewMode)
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
    saveRentalVisibleColumns(visibleColumns)
  }, [visibleColumns])

  const highlightParam = searchParams.get('highlight')?.trim() || ''

  useEffect(() => {
    if (!highlightParam) return
    const exists = properties.some((property) => property.id === highlightParam)
    if (!exists) {
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

    setHighlightedId(highlightParam)
    setStateFilter('')
    setTownFilter('')
    setGroupFilter('')
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`rental-row-${highlightParam}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const clearHighlight = window.setTimeout(() => {
      setHighlightedId(null)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        },
        { replace: true }
      )
    }, 1800)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(clearHighlight)
    }
  }, [highlightParam, properties, setSearchParams])

  const rows = useMemo((): PropertyTableRow[] => {
    return properties.map((property) => {
      const pricing = buildRentalPricingSummary(
        property,
        clients,
        getContractForClient
      )
      const bedOcc = rentalBedOccupancyForProperty(
        property,
        clients,
        getContractForClient
      )
      return {
        id: property.id,
        address: property.address,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        maxTenants: bedOcc.maxOccupancy,
        currentTenants: bedOcc.currentOccupants,
        unitCount: property.unitCount,
        openUnits: bedOcc.availableBeds,
        totalBeds: bedOcc.totalBeds,
        occupiedBeds: bedOcc.occupiedBeds,
        monthlyRent: pricing.unitMonthlyRent,
        tenantShare: pricing.tenantShare,
        unitLabel: pricing.unitLabel,
      }
    })
  }, [properties, clients, getContractForClient])

  const editingProperty = useMemo(
    () => properties.find((p) => p.id === editingPropertyId) ?? null,
    [properties, editingPropertyId]
  )

  const interestByPropertyId = useMemo(
    () =>
      rentalInterestByPropertyId(
        properties,
        registrations,
        clients,
        getContractForClient
      ),
    [properties, registrations, clients, getContractForClient]
  )

  const propertyById = useMemo(() => {
    const map = new Map(properties.map((property) => [property.id, property]))
    return map
  }, [properties])

  const stateOptions = useMemo(
    () =>
      uniqueSorted(
        rows.map((row) => propertyState(row, propertyById.get(row.id)))
      ),
    [rows, propertyById]
  )

  const townOptions = useMemo(() => {
    const towns = rows
      .filter((row) => {
        if (!stateFilter) return true
        return propertyState(row, propertyById.get(row.id)) === stateFilter
      })
      .map((row) => propertyTown(row, propertyById.get(row.id)))
    return uniqueSortedInsensitive(towns)
  }, [rows, propertyById, stateFilter])

  const groupOptions = useMemo(
    () => regions.map((region) => ({ value: region.id, label: region.name })),
    [regions]
  )

  const cycleState = shouldCycleLocationFilter(
    stateOptions.length,
    RENTAL_STATE_FILTER_CYCLE_MAX
  )
  const cycleTown = shouldCycleLocationFilter(
    townOptions.length,
    RENTAL_TOWN_FILTER_CYCLE_MAX
  )
  const cycleGroup = shouldCycleLocationFilter(
    groupOptions.length,
    RENTAL_GROUP_FILTER_CYCLE_MAX
  )

  const filteredSortedRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const property = propertyById.get(row.id)
      const state = propertyState(row, property)
      const town = propertyTown(row, property)
      const matchesState = !stateFilter || state === stateFilter
      const matchesTown = !townFilter || townsMatch(town, townFilter)
      const matchesGroup = contractMatchesLocationFilter(
        {
          areaCode: null,
          state,
          lat: property?.addressDetails?.lat ?? null,
          lng: property?.addressDetails?.lng ?? null,
        },
        { kind: groupFilter ? 'region' : null, value: groupFilter },
        regions
      )
      return matchesState && matchesTown && matchesGroup
    })

    return [...filtered].sort((a, b) =>
      compareRows(a, b, sortColumn, sortDirection)
    )
  }, [
    rows,
    stateFilter,
    townFilter,
    groupFilter,
    regions,
    propertyById,
    sortColumn,
    sortDirection,
  ])

  const cycleStateFilter = () => {
    setStateFilter((current) => nextOptionalLocationFilter(current, stateOptions))
  }

  const cycleTownFilter = () => {
    setTownFilter((current) => nextOptionalLocationFilter(current, townOptions))
  }

  const cycleGroupFilter = () => {
    setGroupFilter((current) =>
      nextOptionalLocationFilter(
        current,
        groupOptions.map((option) => option.value)
      )
    )
  }

  useEffect(() => {
    const activeId: RentalTableColumnId =
      sortColumn === 'currentTenants'
        ? 'occupancy'
        : (sortColumn as RentalTableColumnId)
    if (visibleColumns.includes(activeId)) return
    const fallback = visibleColumns[0]
    if (!fallback) return
    setSortColumn(fallback)
    setSortDirection(
      fallback === 'address' || fallback === 'propertyType' ? 'asc' : 'desc'
    )
  }, [visibleColumns, sortColumn])

  useEffect(() => {
    if (!stateFilter) return
    if (!stateOptions.includes(stateFilter)) setStateFilter('')
  }, [stateFilter, stateOptions])

  useEffect(() => {
    if (!townFilter) return
    const stillValid = townOptions.some((town) => townsMatch(town, townFilter))
    if (!stillValid) setTownFilter('')
  }, [townFilter, townOptions])

  useEffect(() => {
    if (!groupFilter) return
    const stillValid = groupOptions.some((option) => option.value === groupFilter)
    if (!stillValid) setGroupFilter('')
  }, [groupFilter, groupOptions])

  const handleSortChange = (column: PropertySortColumn) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortColumn(column)
    setSortDirection(column === 'address' || column === 'propertyType' ? 'asc' : 'desc')
  }

  const handleAdded = () => {
    setSuccessMessage('Rental added successfully.')
    window.setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleRowClick = (row: PropertyTableRow) => {
    const property = properties.find((entry) => entry.id === row.id) ?? null
    setSelectedRental(property)
  }

  const locationFilterActive = Boolean(stateFilter || townFilter || groupFilter)
  const locationFilterSummary = [
    stateFilter || null,
    townFilter || null,
    groupFilter
      ? getRentalGroupFilterLabel(groupFilter, regions)
      : null,
  ].filter(Boolean)

  const stateFilterLabel = getRentalStateFilterLabel(stateFilter)
  const townFilterLabel = getRentalTownFilterLabel(townFilter)
  const groupFilterLabel = getRentalGroupFilterLabel(groupFilter, regions)

  const displaySettings =
    properties.length > 0 ? (
      <Card className="w-fit max-w-full !px-3 !py-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Display Settings
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {effectiveViewMode === 'tile' && !isMobile ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Rental tile size"
                className="min-w-[12.5rem] flex-none"
              />
            ) : null}

            <button
              type="button"
              onClick={() => setFilterBarOpen((open) => !open)}
              aria-expanded={filterBarOpen}
              aria-controls="rentals-filter-options"
              aria-label="Filter rentals by location"
              title="Filter by state, town, or group"
              className={cn(
                filterButtonClass,
                'gap-1.5',
                filterBarOpen || locationFilterActive
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              Filter
              {locationFilterSummary.length > 0 ? (
                <span className="max-w-[9rem] truncate normal-case tracking-normal text-ink-muted">
                  · {locationFilterSummary.join(' · ')}
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
              aria-label="Rentals display"
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
          </div>

          {filterBarOpen ? (
            <div
              id="rentals-filter-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
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

                {cycleTown ? (
                  <button
                    type="button"
                    onClick={cycleTownFilter}
                    aria-label={`Town filter: ${townFilterLabel}. Click to cycle available towns.`}
                    title={
                      townFilter
                        ? townFilterLabel
                        : townOptions.length > 0
                          ? `Click to cycle: ${RENTAL_TOWN_FILTER_ANY_LABEL} → ${townOptions.join(' → ')}`
                          : RENTAL_TOWN_FILTER_ANY_LABEL
                    }
                    className={cn(
                      locationFilterControlClass,
                      'inline-flex items-center',
                      locationFilterToneClass(Boolean(townFilter))
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{townFilterLabel}</span>
                  </button>
                ) : (
                  <select
                    aria-label="Town filter"
                    title={townFilterLabel}
                    value={
                      townOptions.find((town) => townsMatch(town, townFilter)) ??
                      ''
                    }
                    onChange={(e) => setTownFilter(e.target.value)}
                    className={cn(
                      locationFilterControlClass,
                      'appearance-none truncate focus:outline-none focus:ring-1 focus:ring-brand',
                      locationFilterToneClass(Boolean(townFilter))
                    )}
                  >
                    <option value="">{RENTAL_TOWN_FILTER_ANY_LABEL}</option>
                    {townOptions.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                )}

                <div
                  role="group"
                  aria-label="Rental groups"
                  className={segmentedShellClass}
                >
                  {cycleGroup ? (
                    <button
                      type="button"
                      onClick={cycleGroupFilter}
                      aria-label={`Group filter: ${groupFilterLabel}. Click to cycle available groups.`}
                      title={
                        groupFilter
                          ? groupFilterLabel
                          : groupOptions.length > 0
                            ? `Click to cycle: ${RENTAL_GROUP_FILTER_ANY_LABEL} → ${groupOptions.map((o) => o.label).join(' → ')}`
                            : RENTAL_GROUP_FILTER_ANY_LABEL
                      }
                      aria-pressed={Boolean(groupFilter)}
                      className={cn(
                        segmentedSegmentClass,
                        RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS,
                        'min-w-0',
                        groupFilter
                          ? 'bg-brand text-surface-paper'
                          : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                      )}
                    >
                      <span className="truncate">{groupFilterLabel}</span>
                    </button>
                  ) : (
                    <select
                      aria-label="Group filter"
                      title={groupFilterLabel}
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className={cn(
                        segmentedSegmentClass,
                        RENTAL_GROUP_FILTER_BUTTON_WIDTH_CLASS,
                        'min-w-0 appearance-none truncate border-0 pr-5',
                        'bg-no-repeat bg-[length:0.5rem_0.5rem] bg-[position:right_0.3rem_center]',
                        'bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
                        'focus:outline-none',
                        groupFilter
                          ? 'bg-brand text-surface-paper'
                          : 'bg-transparent text-ink-muted hover:bg-ink/5 hover:text-ink'
                      )}
                    >
                      <option value="">{RENTAL_GROUP_FILTER_ANY_LABEL}</option>
                      {groupOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    title="Edit Groups"
                    aria-label="Edit Groups"
                    aria-pressed={regionsOpen}
                    onClick={() => setRegionsOpen(true)}
                    className={cn(
                      segmentedSegmentClass,
                      'shrink-0 whitespace-nowrap',
                      regionsOpen
                        ? 'bg-ink/10 text-ink'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                    )}
                  >
                    Edit Groups
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {locationFilterActive && (
            <p className="text-xs text-ink-faint">
              Showing {filteredSortedRows.length} of {rows.length} rentals
              {stateFilter ? ` · ${stateFilter}` : ''}
              {townFilter ? ` · ${townFilter}` : ''}
              {groupFilter ? ` · ${groupFilterLabel}` : ''}
            </p>
          )}
        </div>
      </Card>
    ) : undefined

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Rentals"
        help={rentalsHelp}
        action={<AddRentalButton onClick={() => setAddOpen(true)} />}
        below={displaySettings}
      />

      {successMessage ? (
        <p className="mb-4 text-sm font-medium text-brand" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="space-y-6">
        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No rentals yet"
            description="Add your first rental to start building your portfolio and make it available for tenants and leases."
            action={<AddRentalButton onClick={() => setAddOpen(true)} />}
          />
        ) : (
          <div className="space-y-3">
            {filteredSortedRows.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No matching rentals"
                description="Clear location filters or adjust Display Settings."
              />
            ) : effectiveViewMode === 'spreadsheet' ? (
              <PropertyTable
                rows={filteredSortedRows}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onRowClick={handleRowClick}
                onEditClick={(row) => setEditingPropertyId(row.id)}
                highlightedId={highlightedId}
                interestByPropertyId={interestByPropertyId}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                arrangeColumns={arrangeColumns}
                onArrangeDone={() => setArrangeColumns(false)}
              />
            ) : (
              <div
                className="tile-scale-root"
                style={leaseTileScaleStyle(factor)}
              >
                <div className={sectionTileGridClassName(mobileTileColumns)}>
                  {filteredSortedRows.map((row) => {
                    const isHighlighted = highlightedId === row.id
                    const property = propertyById.get(row.id)
                    const occupancyTone = rentalOccupancyTone(
                      row.openUnits,
                      row.totalBeds
                    )
                    const occupancyLabel = rentalOccupancyStatusLabel(
                      row.openUnits,
                      row.totalBeds
                    )
                    const occupants = property
                      ? activeTenantsAtProperty(
                          property,
                          clients,
                          getContractForClient
                        ).map((tenant) => {
                          const found = findBedInLayout(
                            property.bedroomsLayout,
                            tenant.bedroomId,
                            tenant.bedId
                          )
                          return {
                            id: tenant.id,
                            name: tenant.name,
                            bedLabel: found
                              ? formatBedAssignmentLabel(found.bedroom, found.bed)
                              : tenant.unitOrRoomLabel,
                          }
                        })
                      : []
                    return (
                      <Card
                        key={row.id}
                        id={`rental-row-${row.id}`}
                        padding="none"
                        role="button"
                        tabIndex={0}
                        aria-label={`${row.address}. ${occupancyLabel}. Open rental details`}
                        onClick={() => handleRowClick(row)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleRowClick(row)
                          }
                        }}
                        className={cn(
                          'tile-card lease-tile-card scroll-mt-28 cursor-pointer transition-colors',
                          `rental-tile--${occupancyTone}`,
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                          isHighlighted && 'property-table-row--highlight'
                        )}
                      >
                        <div className="lease-tile-card__body">
                          <div className="lease-tile-card__content">
                            <div className="flex items-start justify-between gap-2">
                              <div className="lease-tile-card__icon" aria-hidden>
                                <Building2 strokeWidth={1.75} />
                              </div>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface hover:text-brand"
                                title={`Edit ${row.address}`}
                                aria-label={`Edit ${row.address}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setEditingPropertyId(row.id)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                            </div>

                            <h3 className="tile-card__title tile-card__address-static">
                              {row.address}
                            </h3>

                            <p className="tile-card__body font-semibold text-ink">
                              {row.propertyType}
                            </p>

                            <p className="tile-card__meta tabular-nums">
                              Monthly Rent: {formatUsd(row.monthlyRent)}
                              {row.unitLabel ? ` · ${row.unitLabel}` : ''}
                            </p>
                            {row.tenantShare != null && row.currentTenants > 1 ? (
                              <p className="tile-card__meta tabular-nums">
                                Per bed share: {formatUsd(row.tenantShare)}/month
                              </p>
                            ) : null}
                            <p className="tile-card__meta tabular-nums text-ink-muted">
                              Beds: {row.occupiedBeds} of {row.totalBeds} occupied
                            </p>

                            <BedsOccupancyTag
                              bedrooms={row.bedrooms}
                              currentTenants={row.currentTenants}
                              maxTenants={row.maxTenants}
                              occupants={occupants}
                              onOccupantClick={setDetailsTenantId}
                              className="mt-0.5"
                            />
                            <RentalInterestCue
                              propertyId={row.id}
                              applicantCount={
                                interestByPropertyId.get(row.id)?.applicantCount ?? 0
                              }
                              pendingTenantCount={
                                interestByPropertyId.get(row.id)?.pendingTenantCount ?? 0
                              }
                            />
                          </div>

                          <div className="lease-tile-card__actions">
                            <div className="lease-tile-card__action-item">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="lease-tile-card__action-btn !px-2.5 !py-1.5 !text-[length:var(--tile-meta)]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleRowClick(row)
                                }}
                              >
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                Open
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <UpcomingOpeningsPanel />
      </div>

      <AddRentalModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAdded}
      />

      <AddRentalModal
        open={Boolean(editingProperty)}
        property={editingProperty}
        onClose={() => setEditingPropertyId(null)}
        onSaved={() => setEditingPropertyId(null)}
      />

      <EditRegionsModal open={regionsOpen} onClose={() => setRegionsOpen(false)} />

      <RentalDetailModal
        property={selectedRental}
        open={Boolean(selectedRental)}
        onClose={() => setSelectedRental(null)}
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

/** Alias matching Rentals terminology. */
export const RentalsPage = PropertiesPage
