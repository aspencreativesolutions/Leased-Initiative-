import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
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
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/FormField'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { isMappableAddress } from '@/lib/addressMap'
import {
  getLeaseAgreementBadgeLabel,
  getLeaseAgreementBadgeRank,
  getLeaseAgreementStatusFilterLabel,
  nextLeaseAgreementStatusFilter,
  type LeaseAgreementStatusFilter,
  getLeaseTermProgress,
} from '@/lib/clientUtils'
import { monthsBetweenLeaseDates } from '@/lib/leaseSchedule'
import { getTenantAssignedProperty } from '@/lib/officialTenantLocationDisplay'
import { cn, formatDate } from '@/lib/utils'
import {
  contractMatchesLocationFilter,
  getContractLocationMeta,
  uniqueSorted,
  type ContractLocationFilterKind,
} from '@/lib/contractLocationFilters'
import {
  LEASE_TILE_SCALE_DEFAULT,
  leaseTileGridClassName,
  leaseTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'

/** Bumped so the new 100% default applies for existing sessions. */
const CONTRACTS_TILE_SCALE_KEY = 'contracts-tile-scale-v2'
const CONTRACTS_VIEW_KEY = 'contracts-view-mode'

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
  id: ContractLocationFilterKind
  label: string
}[] = [
  { id: 'state', label: 'Property State' },
  { id: 'areaCode', label: 'Area Code' },
  { id: 'region', label: 'Group' },
]

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

export function ContractsPage() {
  const { clients, contracts, properties, settings, refresh } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [preselectedId, setPreselectedId] = useState<string | undefined>()
  const [filterKind, setFilterKind] = useState<ContractLocationFilterKind | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaseAgreementStatusFilter | null>(
    null
  )
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<{ address: string; tenantName: string } | null>(
    null
  )
  const { scale, setScale, factor } = useTileScale(
    CONTRACTS_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )
  const [viewMode, setViewMode] = useState<ContractsViewMode>(readViewModePreference)
  const [tableSortColumn, setTableSortColumn] = useState<ContractSortColumn>('tenant')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    try {
      localStorage.setItem(CONTRACTS_VIEW_KEY, viewMode)
    } catch {
      /* ignore quota / private mode */
    }
  }, [viewMode])

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
    if (filterKind === 'state') {
      return stateOptions.map((state) => ({ value: state, label: state }))
    }
    if (filterKind === 'region') {
      return regions.map((region) => ({ value: region.id, label: region.name }))
    }
    return []
  }, [filterKind, areaCodeOptions, stateOptions, regions])

  const filteredOptions = useMemo(() => {
    return contractOptions.filter((option) => {
      if (
        !contractMatchesLocationFilter(
          {
            areaCode: option.areaCode,
            state: option.state,
            lat: option.lat,
            lng: option.lng,
          },
          { kind: filterKind, value: filterValue },
          regions
        )
      ) {
        return false
      }

      if (!statusFilter) return true

      const label = option.client
        ? getLeaseAgreementBadgeLabel(option.client, option.contract)
        : null
      return label === statusFilter
    })
  }, [contractOptions, filterKind, filterValue, regions, statusFilter])

  const tableRows: ContractTableRow[] = useMemo(() => {
    const rows = filteredOptions.map(({ contract, client, clientName, address, progress }) => {
      const statusLabel = client
        ? getLeaseAgreementBadgeLabel(client, contract)
        : null
      const statusHoverDetail =
        statusLabel === 'Active' || statusLabel === 'Signed'
          ? contract.signedAt
            ? formatDate(contract.signedAt)
            : undefined
          : statusLabel === 'Sent' && contract.sentAt
            ? formatDate(contract.sentAt)
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

  const selectFilterKind = (kind: ContractLocationFilterKind) => {
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

  const handleTableSortChange = (column: ContractSortColumn) => {
    if (tableSortColumn === column) {
      setTableSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setTableSortColumn(column)
    setTableSortDirection('asc')
  }

  useEffect(() => {
    if (!filterKind || !filterValue) return
    const stillValid = valueOptions.some((opt) => opt.value === filterValue)
    if (!stillValid) setFilterValue('')
  }, [filterKind, filterValue, valueOptions])

  const filtersActive = statusFilter !== null || filterKind !== null
  const filterButtonLabel = statusFilter ?? 'Filter'
  const locationFilterLabel = filterKind
    ? LOCATION_FILTER_OPTIONS.find((o) => o.id === filterKind)?.label
    : null

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
                statusFilter
                  ? `Filter: ${statusFilter}. Open to change lease status filter.`
                  : 'Filter lease agreements by status'
              }
              title={
                statusFilter
                  ? `Filtered to ${statusFilter}`
                  : 'Filter by lease status'
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
              {!statusFilter && locationFilterLabel ? (
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

            {viewMode === 'tile' ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Lease tile size"
                className="min-w-[12.5rem] flex-none"
              />
            ) : null}
          </div>

          {filterBarOpen ? (
            <div
              id="contracts-filter-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Lease Status
              </p>
              <button
                type="button"
                onClick={cycleStatusFilter}
                aria-label={`Lease status filter: ${getLeaseAgreementStatusFilterLabel(statusFilter)}. Click to cycle Any, Signed, Sent, Active.`}
                title="Click to cycle lease status: Any → Signed → Sent → Active"
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

              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Location
              </p>
              <div className="flex flex-wrap items-center gap-2">
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
                      filterKind === 'areaCode'
                        ? 'Area code'
                        : filterKind === 'state'
                          ? 'Property state'
                          : 'Group'
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

          {(statusFilter || (filterKind && filterValue)) && (
            <p className="text-xs text-ink-faint">
              Showing {filteredOptions.length} of {contractOptions.length} leases
            </p>
          )}
        </div>
      </Card>
    ) : undefined

  return (
    <>
      <PageHeader
        title="Lease Agreements"
        subtitle="Track lease status, term progress, and ending urgency across all tenants."
        below={displaySettings}
      />

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
          description="Try another lease status (Any, Signed, Sent, or Active), area code, state, or group."
        />
      ) : viewMode === 'spreadsheet' ? (
        <ContractTable
          rows={tableRows}
          sortColumn={tableSortColumn}
          sortDirection={tableSortDirection}
          onSortChange={handleTableSortChange}
          onDelete={(contractId) => {
            setPreselectedId(contractId)
            setDeleteOpen(true)
          }}
        />
      ) : (
        <div className="tile-scale-root" style={leaseTileScaleStyle(factor)}>
          <div className={leaseTileGridClassName(scale)}>
            {filteredOptions.map(({ contract, client, clientName, address, progress }) => {
              const canMap = isMappableAddress(address)
              const statusLabel = client
                ? getLeaseAgreementBadgeLabel(client, contract)
                : null
              const statusHoverDetail =
                statusLabel === 'Active' || statusLabel === 'Signed'
                  ? contract.signedAt
                    ? formatDate(contract.signedAt)
                    : undefined
                  : statusLabel === 'Sent' && contract.sentAt
                    ? formatDate(contract.sentAt)
                    : undefined

              return (
                <Card
                  key={contract.id}
                  padding="none"
                  className="tile-card lease-tile-card"
                >
                  <div className="lease-tile-card__body">
                    <div className="lease-tile-card__content">
                      <div className="lease-tile-card__top">
                        <div className="lease-tile-card__icon" aria-hidden>
                          <FileText strokeWidth={1.75} />
                        </div>

                        <p className="tile-card__body font-semibold text-ink">{clientName}</p>

                        {client && statusLabel ? (
                          <div className="lease-tile-card__status">
                            <StatusBadge
                              type="contract"
                              status={client.contractStatus}
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
                            {address}
                          </button>
                        ) : (
                          <h3 className="tile-card__title tile-card__address-static">{address}</h3>
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
    </>
  )
}
