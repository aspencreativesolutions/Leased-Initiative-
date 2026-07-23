import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  MapPinned,
  Plus,
  Search,
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
import { UpcomingOpeningsPanel } from '@/components/dashboard/UpcomingOpeningsPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations'
import {
  contractMatchesLocationFilter,
  getAddressState,
  uniqueSorted,
} from '@/lib/contractLocationFilters'
import {
  activeTenantsAtProperty,
  openUnitsForRental,
  rentalInterestByPropertyId,
  rentalOccupancyStatusLabel,
  rentalOccupancyTone,
} from '@/lib/properties'
import { buildRentalPricingSummary, formatUsd } from '@/lib/rentalRent'
import {
  RENTAL_FILTER_BY_BUTTON_WIDTH_CLASS,
  RENTAL_LOCATION_FILTER_OPTIONS,
  RENTAL_TYPE_FILTER_OPTIONS,
  rentalTypeFilterButtonLabel,
  type RentalLocationFilterKind,
} from '@/lib/rentalDisplaySort'
import {
  LEASE_TILE_SCALE_DEFAULT,
  leaseTileGridClassName,
  leaseTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import { PROPERTY_HOUSING_TYPES, type Property, type PropertyHousingType } from '@/types'
import { cn } from '@/lib/utils'

/** Same 100% default as lease agreements; bumped key if defaults change later. */
const RENTALS_TILE_SCALE_KEY = 'rentals-tile-scale-v1'
const RENTALS_VIEW_KEY = 'rentals-view-mode'

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

const filterSelectClass = [
  'shrink-0 w-full sm:w-[11.5rem]',
  '[&_label]:mb-0.5 [&_label_span]:text-[8px] [&_label_span]:leading-tight',
  '[&_select]:w-full [&_select]:py-1.5 [&_select]:pl-2 [&_select]:pr-7 [&_select]:text-[11px]',
  '[&_select]:appearance-none [&_select]:bg-no-repeat [&_select]:bg-[length:0.55rem_0.55rem] [&_select]:bg-[position:right_0.35rem_center]',
  '[&_select]:bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
].join(' ')

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

export function PropertiesPage() {
  const { properties, clients, getContractForClient, settings } = useApp()
  const { registrations } = usePendingRegistrations()
  const [searchParams, setSearchParams] = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<Property | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PropertyHousingType | ''>('')
  const [filterKind, setFilterKind] = useState<RentalLocationFilterKind | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<PropertySortColumn>('address')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<RentalsViewMode>(readViewModePreference)
  const { scale, setScale, factor } = useTileScale(
    RENTALS_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const companyName = settings.businessName?.trim() || 'your company'
  const regions = settings.contractRegions ?? []

  useEffect(() => {
    try {
      localStorage.setItem(RENTALS_VIEW_KEY, viewMode)
    } catch {
      /* ignore quota / private mode */
    }
  }, [viewMode])

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
    setSearch('')
    setTypeFilter('')
    setFilterKind(null)
    setFilterValue('')
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
      return {
        id: property.id,
        address: property.address,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        maxTenants: property.maxTenants,
        currentTenants: pricing.currentOccupancy,
        unitCount: property.unitCount,
        openUnits: openUnitsForRental(property, clients, getContractForClient),
        monthlyRent: pricing.unitMonthlyRent,
        tenantShare: pricing.tenantShare,
        unitLabel: pricing.unitLabel,
      }
    })
  }, [properties, clients, getContractForClient])

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

  const valueOptions = useMemo(() => {
    if (filterKind === 'state') {
      return stateOptions.map((state) => ({ value: state, label: state }))
    }
    if (filterKind === 'region') {
      return regions.map((region) => ({ value: region.id, label: region.name }))
    }
    return []
  }, [filterKind, stateOptions, regions])

  /** Types present in the portfolio — prefer these in Filter By when available. */
  const availableRentalTypes = useMemo(
    () => RENTAL_TYPE_FILTER_OPTIONS.filter((type) => rows.some((row) => row.propertyType === type)),
    [rows]
  )

  const rentalTypeOptions =
    availableRentalTypes.length > 0 ? availableRentalTypes : RENTAL_TYPE_FILTER_OPTIONS

  const filteredSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rows.filter((row) => {
      const matchesType = !typeFilter || row.propertyType === typeFilter
      const matchesSearch =
        !q ||
        row.address.toLowerCase().includes(q) ||
        row.propertyType.toLowerCase().includes(q)
      const property = propertyById.get(row.id)
      const state = propertyState(row, property)
      const matchesLocation = contractMatchesLocationFilter(
        {
          areaCode: null,
          state,
          lat: property?.addressDetails?.lat ?? null,
          lng: property?.addressDetails?.lng ?? null,
        },
        { kind: filterKind, value: filterValue },
        regions
      )
      return matchesType && matchesSearch && matchesLocation
    })

    return [...filtered].sort((a, b) =>
      compareRows(a, b, sortColumn, sortDirection)
    )
  }, [
    rows,
    search,
    typeFilter,
    filterKind,
    filterValue,
    regions,
    propertyById,
    sortColumn,
    sortDirection,
  ])

  const selectFilterKind = (kind: RentalLocationFilterKind) => {
    if (filterKind === kind) {
      setFilterKind(null)
      setFilterValue('')
      return
    }
    setFilterKind(kind)
    setFilterValue('')
  }

  const selectTypeFilter = (type: PropertyHousingType | null) => {
    setTypeFilter(type ?? '')
  }

  const clearFilters = () => {
    setTypeFilter('')
    setFilterKind(null)
    setFilterValue('')
  }

  useEffect(() => {
    if (!filterKind || !filterValue) return
    const stillValid = valueOptions.some((opt) => opt.value === filterValue)
    if (!stillValid) setFilterValue('')
  }, [filterKind, filterValue, valueOptions])

  useEffect(() => {
    if (!typeFilter) return
    if (rentalTypeOptions.length === 0) return
    if (!(rentalTypeOptions as readonly string[]).includes(typeFilter)) {
      setTypeFilter('')
    }
  }, [typeFilter, rentalTypeOptions])

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

  const locationFilterActive = Boolean(filterKind && filterValue)
  const rentalTypeFilterActive = Boolean(typeFilter)
  const filtersActive = rentalTypeFilterActive || filterKind !== null
  const filterButtonLabel = typeFilter
    ? rentalTypeFilterButtonLabel(typeFilter)
    : 'Filter By'

  const displaySettings =
    properties.length > 0 ? (
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
              aria-controls="rentals-filter-by-options"
              aria-label={
                typeFilter
                  ? `Filter By: ${typeFilter}. Open to change rental type filter.`
                  : 'Filter By rental type'
              }
              title={
                typeFilter
                  ? `Filtered to ${typeFilter}`
                  : 'Filter By rental type'
              }
              className={cn(
                filterButtonClass,
                RENTAL_FILTER_BY_BUTTON_WIDTH_CLASS,
                'shrink-0 justify-between gap-1.5',
                filterBarOpen || filtersActive
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              <span className="min-w-0 text-left leading-none">{filterButtonLabel}</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform',
                  filterBarOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>

            {viewMode === 'tile' ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Rental tile size"
                className="min-w-[12.5rem] flex-none"
              />
            ) : null}

            <div
              role="group"
              aria-label="Rentals display"
              className="inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]"
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
          </div>

          {filterBarOpen ? (
            <div
              id="rentals-filter-by-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Filter By
              </p>
              <div
                role="group"
                aria-label="Filter By rental type"
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={clearFilters}
                  aria-pressed={typeFilter === '' && filterKind === null}
                  aria-label="All Rentals — clear filter"
                  className={cn(
                    filterButtonClass,
                    typeFilter === '' && filterKind === null
                      ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                      : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                  )}
                >
                  All Rentals
                </button>
                {rentalTypeOptions.map((type) => {
                  const isActive = typeFilter === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectTypeFilter(isActive ? null : type)}
                      aria-pressed={isActive}
                      aria-label={`Filter By ${type}`}
                      className={cn(
                        filterButtonClass,
                        isActive
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>

              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Location
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {RENTAL_LOCATION_FILTER_OPTIONS.map(({ id, label }) => {
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
                    aria-label={filterKind === 'state' ? 'State' : 'Group'}
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

          {(locationFilterActive || rentalTypeFilterActive) && (
            <p className="text-xs text-ink-faint">
              Showing {filteredSortedRows.length} of {rows.length} rentals
              {rentalTypeFilterActive && typeFilter ? ` · ${typeFilter}` : ''}
            </p>
          )}
        </div>
      </Card>
    ) : undefined

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Rentals"
        subtitle={`Manage the rental portfolio for ${companyName}. Rentals here appear in tenant signup, invitations, leases, and Upcoming Openings.`}
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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <label className="relative block min-w-0 flex-1 sm:max-w-sm">
                <span className="sr-only">Search rentals</span>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by address or rental type…"
                  className={cn(
                    'w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line',
                    'bg-surface-paper py-1.5 pl-8 pr-3 text-[11px] text-ink placeholder:text-ink-faint',
                    'focus:border-ink focus:outline-none focus:ring-0'
                  )}
                />
              </label>
              <Select
                label="Rental type"
                name="propertyTypeFilter"
                value={typeFilter}
                onChange={(e) => {
                  const next = (e.target.value || '') as PropertyHousingType | ''
                  setTypeFilter(next)
                }}
                className={filterSelectClass}
              >
                <option value="">All types</option>
                {PROPERTY_HOUSING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <p className="text-sm text-ink-muted">
              Select any rental to view its property details, current tenants, lease information,
              occupancy, and related records.
            </p>

            {filteredSortedRows.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No matching rentals"
                description="Try a different search, clear the rental type filter, or adjust Display Settings."
              />
            ) : viewMode === 'spreadsheet' ? (
              <PropertyTable
                rows={filteredSortedRows}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onRowClick={handleRowClick}
                highlightedId={highlightedId}
              />
            ) : (
              <div className="tile-scale-root" style={leaseTileScaleStyle(factor)}>
                <div className={leaseTileGridClassName(scale)}>
                  {filteredSortedRows.map((row) => {
                    const isHighlighted = highlightedId === row.id
                    const property = propertyById.get(row.id)
                    const occupancyTone = rentalOccupancyTone(
                      row.openUnits,
                      row.unitCount
                    )
                    const occupancyLabel = rentalOccupancyStatusLabel(
                      row.openUnits,
                      row.unitCount
                    )
                    const occupants = property
                      ? activeTenantsAtProperty(
                          property,
                          clients,
                          getContractForClient
                        ).map((tenant) => ({
                          id: tenant.id,
                          name: tenant.name,
                        }))
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
                            <div className="lease-tile-card__icon" aria-hidden>
                              <Building2 strokeWidth={1.75} />
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
                            <p className="tile-card__meta tabular-nums">
                              Occupancy: {row.currentTenants} of {row.maxTenants}
                              {row.tenantShare != null && row.currentTenants > 1
                                ? ` · Per Tenant: ${formatUsd(row.tenantShare)}/month`
                                : ''}
                            </p>

                            <BedsOccupancyTag
                              bedrooms={row.bedrooms}
                              currentTenants={row.currentTenants}
                              maxTenants={row.maxTenants}
                              occupants={occupants}
                              className="mt-0.5"
                            />
                            <RentalInterestCue
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
        onAdded={handleAdded}
      />

      <EditRegionsModal open={regionsOpen} onClose={() => setRegionsOpen(false)} />

      <RentalDetailModal
        property={selectedRental}
        open={Boolean(selectedRental)}
        onClose={() => setSelectedRental(null)}
      />
    </div>
  )
}

/** Alias matching Rentals terminology. */
export const RentalsPage = PropertiesPage
