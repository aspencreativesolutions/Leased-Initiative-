import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, MapPinned, Plus, Trash2 } from 'lucide-react'
import { AddressMapModal } from '@/components/contracts/AddressMapModal'
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
import { isMappableAddress } from '@/lib/addressMap'
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

const FILTER_KINDS: { id: ContractLocationFilterKind; label: string }[] = [
  { id: 'areaCode', label: 'Area code' },
  { id: 'state', label: 'State' },
  { id: 'region', label: 'Region' },
]

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

export function ContractsPage() {
  const { clients, contracts, settings, refresh } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [preselectedId, setPreselectedId] = useState<string | undefined>()
  const [filterKind, setFilterKind] = useState<ContractLocationFilterKind | null>(null)
  const [filterValue, setFilterValue] = useState('')
  const [mapTarget, setMapTarget] = useState<{ address: string; tenantName: string } | null>(
    null
  )
  const { scale, setScale, factor } = useTileScale(
    CONTRACTS_TILE_SCALE_KEY,
    LEASE_TILE_SCALE_DEFAULT
  )

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

  useEffect(() => {
    if (!filterKind || !filterValue) return
    const stillValid = valueOptions.some((opt) => opt.value === filterValue)
    if (!stillValid) setFilterValue('')
  }, [filterKind, filterValue, valueOptions])

  return (
    <>
      <PageHeader
        title="Lease Agreements"
        subtitle="Track lease agreement status across all tenants."
      />

      {contracts.length > 0 && (
        <Card className="mb-4 !p-3.5 sm:!px-4 sm:!py-3.5">
          <div className="flex flex-col gap-2.5">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
                Display Settings
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {FILTER_KINDS.map(({ id, label }) => {
                  const isActive = filterKind === id
                  return (
                    <button
                      key={id}
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
                })}
              </div>

              {filterKind && (
                <Select
                  label=""
                  aria-label={
                    filterKind === 'areaCode'
                      ? 'Area code'
                      : filterKind === 'state'
                        ? 'State'
                        : 'Region'
                  }
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-[9.5rem] shrink-0 [&_select]:h-9 [&_select]:py-0"
                >
                  <option value="">
                    {filterKind === 'region' && regions.length === 0
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
              )}

              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Lease tile size"
                className="min-w-[14rem] flex-[1_1_14rem]"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => setRegionsOpen(true)}
              >
                <MapPinned className="h-4 w-4" />
                <Plus className="h-3.5 w-3.5" />
                Edit Regions
              </Button>
            </div>

            {filterKind && filterValue && (
              <p className="text-xs text-ink-faint">
                Showing {filteredOptions.length} of {contractOptions.length} leases
              </p>
            )}
          </div>
        </Card>
      )}

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
          description="Try another area code, state, or region — or clear the filter."
        />
      ) : (
        <div className="tile-scale-root" style={leaseTileScaleStyle(factor)}>
          <div className={leaseTileGridClassName(scale)}>
            {filteredOptions.map(({ contract, client, clientName, address }) => {
              const canMap = isMappableAddress(address)
              const dateLine = client?.followUpDate
                ? `Follow-up: ${formatDate(client.followUpDate)}`
                : contract.signedAt
                  ? `Signed: ${formatDate(contract.signedAt)}`
                  : contract.sentAt
                    ? `Sent: ${formatDate(contract.sentAt)}`
                    : null

              return (
                <Card key={contract.id} padding="none" className="tile-card lease-tile-card">
                  <div className="lease-tile-card__body">
                    <div className="lease-tile-card__content">
                      <div className="lease-tile-card__icon" aria-hidden>
                        <FileText strokeWidth={1.75} />
                      </div>

                      <p className="tile-card__body font-semibold text-ink">{clientName}</p>

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

                      {client ? (
                        <div className="lease-tile-card__status">
                          <StatusBadge type="contract" status={client.contractStatus} />
                        </div>
                      ) : null}

                      {dateLine ? <p className="tile-card__meta">{dateLine}</p> : null}
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
