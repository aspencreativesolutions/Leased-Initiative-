import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, MapPinned, Trash2 } from 'lucide-react'
import { DeleteContractModal } from '@/components/contracts/DeleteContractModal'
import { EditRegionsModal } from '@/components/contracts/EditRegionsModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/FormField'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { fetchAdminAuditLog } from '@/lib/contractsApi'
import {
  contractMatchesLocationFilter,
  getContractLocationMeta,
  uniqueSorted,
  type ContractLocationFilterKind,
} from '@/lib/contractLocationFilters'
import {
  tileGridClassName,
  tileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import type { AdminAuditEntry } from '@/types'

const CONTRACTS_TILE_SCALE_KEY = 'contracts-tile-scale'

const FILTER_KINDS: { id: ContractLocationFilterKind; label: string }[] = [
  { id: 'areaCode', label: 'Area code' },
  { id: 'state', label: 'State' },
  { id: 'region', label: 'Region' },
]

export function ContractsPage() {
  const { clients, contracts, settings, refresh } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [preselectedId, setPreselectedId] = useState<string | undefined>()
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([])
  const [filterKind, setFilterKind] = useState<ContractLocationFilterKind | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const { scale, setScale, factor } = useTileScale(CONTRACTS_TILE_SCALE_KEY)

  const regions = settings.contractRegions ?? []

  const contractOptions = useMemo(
    () =>
      contracts.map((contract) => {
        const client = clients.find((c) => c.id === contract.clientId)
        const location = getContractLocationMeta(client, contract)
        return {
          contract,
          client,
          clientName: location.tenantName,
          businessName: client?.businessName ?? contract.businessName,
          address: location.address,
          areaCode: location.areaCode,
          state: location.state,
        }
      }),
    [clients, contracts]
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
    return contractOptions.filter((option) =>
      contractMatchesLocationFilter(
        { areaCode: option.areaCode, state: option.state },
        { kind: filterKind, value: filterValue },
        regions
      )
    )
  }, [contractOptions, filterKind, filterValue, regions])

  const selectFilterKind = (kind: ContractLocationFilterKind) => {
    if (filterKind === kind) {
      setFilterKind(null)
      setFilterValue('')
      return
    }
    setFilterKind(kind)
    setFilterValue('')
  }

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await fetchAdminAuditLog({ type: 'contract_deleted', limit: 8 })
      setAuditEntries(data.entries)
    } catch {
      setAuditEntries([])
    }
  }, [])

  useEffect(() => {
    void loadAuditLog()
  }, [loadAuditLog])

  useEffect(() => {
    if (!filterKind || !filterValue) return
    const stillValid = valueOptions.some((opt) => opt.value === filterValue)
    if (!stillValid) setFilterValue('')
  }, [filterKind, filterValue, valueOptions])

  const handleDeleted = async () => {
    await refresh()
    await loadAuditLog()
  }

  return (
    <>
      <PageHeader
        title="Leases"
        subtitle="Track lease status across all tenants."
        action={
          contracts.length > 0 ? (
            <>
              <TileScaleControl
                value={scale}
                onChange={setScale}
                label="Lease tile size"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreselectedId(undefined)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete lease
              </Button>
            </>
          ) : undefined
        }
      />

      {contracts.length > 0 && (
        <Card className="mb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
                Filter
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Narrow contracts by area code, state, or a saved region.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {FILTER_KINDS.map(({ id, label }) => {
                  const isActive = filterKind === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectFilterKind(id)}
                      aria-pressed={isActive}
                      className={cn(
                        'rounded-[var(--radius-sm)] border-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-caps transition-colors',
                        'shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]',
                        isActive
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
              <Select
                label={
                  filterKind === 'areaCode'
                    ? 'Area code'
                    : filterKind === 'state'
                      ? 'State'
                      : filterKind === 'region'
                        ? 'Region'
                        : 'Value'
                }
                value={filterValue}
                disabled={!filterKind}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full sm:w-44"
              >
                <option value="">
                  {!filterKind
                    ? 'Select a filter'
                    : filterKind === 'region' && regions.length === 0
                      ? 'No regions yet'
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => setRegionsOpen(true)}
              >
                <MapPinned className="h-4 w-4" />
                Edit Regions
              </Button>
            </div>
          </div>
          {filterKind && filterValue && (
            <p className="mt-3 text-xs text-ink-faint">
              Showing {filteredOptions.length} of {contractOptions.length} leases
            </p>
          )}
        </Card>
      )}

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No leases in progress"
          description="Start a lease from any tenant profile to see it here."
        />
      ) : filteredOptions.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No leases match this filter"
          description="Try another area code, state, or region — or clear the filter."
        />
      ) : (
        <div className="tile-scale-root" style={tileScaleStyle(factor)}>
          <div className={tileGridClassName(scale)}>
            {filteredOptions.map(({ contract, client, clientName, address }) => (
              <Card key={contract.id} padding="none" className="tile-card">
                <div className="mb-[calc(0.4rem*var(--tile-scale))] min-w-0">
                  <h3 className="tile-card__title truncate">{address}</h3>
                  <p className="tile-card__body mt-0.5 truncate">{clientName}</p>
                </div>
                <div className="mb-[calc(0.35rem*var(--tile-scale))] flex flex-wrap items-center gap-1.5">
                  {client && <StatusBadge type="contract" status={client.contractStatus} />}
                  {contract.sentAt && (
                    <span className="tile-card__label">Portal visible</span>
                  )}
                </div>
                {client?.followUpDate && (
                  <p className="tile-card__meta mb-[calc(0.45rem*var(--tile-scale))]">
                    Follow-up: {formatDate(client.followUpDate)}
                  </p>
                )}
                <div className="mt-auto flex flex-col gap-1">
                  <Link to={`/studio/clients/${contract.clientId}/contract`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full !px-2 !py-1 !text-[length:var(--tile-meta)]"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full !px-2 !py-1 !text-[length:var(--tile-meta)] !text-accent"
                    onClick={() => {
                      setPreselectedId(contract.id)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {auditEntries.length > 0 && (
        <Card className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Recent lease deletions</h3>
          <p className="mt-1 text-xs text-ink-muted">Admin audit log — irreversible actions</p>
          <ul className="mt-4 divide-y divide-line">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-ink">{entry.summary}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {formatDateTime(entry.deletedAt)} · {entry.deletedByEmail} · Audit{' '}
                  <span className="font-mono">{entry.id}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DeleteContractModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        contracts={contractOptions}
        preselectedContractId={preselectedId}
        onDeleted={() => void handleDeleted()}
      />

      <EditRegionsModal open={regionsOpen} onClose={() => setRegionsOpen(false)} />
    </>
  )
}
