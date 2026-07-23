import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Building2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import {
  getTenantAddress,
  shouldShowInOfficialTenants,
} from '@/lib/clientUtils'
import {
  formatLeaseLengthLabel,
  LEASE_LENGTH_OPTIONS,
  parseLeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { fetchPortalUsers } from '@/lib/portalUsersApi'
import { tenantsAtProperty } from '@/lib/properties'
import { normalizeRentalType } from '@/lib/rentalTypes'
import { cn, formatDate } from '@/lib/utils'
import type {
  Client,
  ContractData,
  PendingRegistration,
  PortalUserAccepted,
  Property,
  PropertyHousingType,
} from '@/types'

type LeaseDurationFilter = 'all' | (typeof LEASE_LENGTH_OPTIONS)[number]
type GetContract = (clientId: string) => ContractData | undefined
type RentalFilter = 'all' | PropertyHousingType
type RenterGroup = 'all' | 'official' | 'pending' | 'waiting'

function matchesLeaseFilter(months: number, filter: LeaseDurationFilter): boolean {
  if (filter === 'all') return true
  return months === filter
}

function shortRentalTypeLabel(type: PropertyHousingType): string {
  if (type === 'Basement Apartment / Accessory Dwelling Unit') return 'Basement / ADU'
  if (type === 'Condominium (Condo)') return 'Condo'
  return type
}

export function CompanyDetailsPanel() {
  const { settings, properties, clients, getContractForClient } = useApp()
  const [activeRentalFilter, setActiveRentalFilter] = useState<RentalFilter | null>(null)
  const [activeRenterGroup, setActiveRenterGroup] = useState<RenterGroup | null>(null)
  const [leaseFilter, setLeaseFilter] = useState<LeaseDurationFilter>('all')
  const [waiting, setWaiting] = useState<PendingRegistration[]>([])
  const [pendingApplicants, setPendingApplicants] = useState<PortalUserAccepted[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [pipelineError, setPipelineError] = useState('')

  const refreshPipeline = useCallback(async () => {
    try {
      const data = await fetchPortalUsers()
      setWaiting(data.pending ?? [])
      setPendingApplicants(
        (data.accepted ?? []).filter(
          (user) =>
            !user.isOfficialClient &&
            user.contractStatus !== 'Signed' &&
            user.contractStatus !== 'Completed'
        )
      )
      setPipelineError('')
    } catch (err) {
      setPipelineError(
        err instanceof ApiError ? err.message : 'Could not load waiting and pending renters'
      )
    } finally {
      setPipelineLoading(false)
    }
  }, [])

  const clientsPipelineKey = clients
    .map((c) => `${c.id}:${c.isOfficialClient ? 1 : 0}:${c.contractStatus}`)
    .join('|')

  useEffect(() => {
    void refreshPipeline()
  }, [refreshPipeline, clientsPipelineKey])

  const officialTenants = useMemo(
    () =>
      clients.filter((client) =>
        shouldShowInOfficialTenants(client, getContractForClient(client.id))
      ),
    [clients, getContractForClient]
  )

  const rentalTypeCounts = useMemo(() => {
    const counts = new Map<PropertyHousingType, number>()
    for (const property of properties) {
      const type = normalizeRentalType(property.propertyType)
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  }, [properties])

  const renterCounts = useMemo(
    () => ({
      official: officialTenants.length,
      pending: pendingApplicants.length,
      waiting: waiting.length,
      all: officialTenants.length + pendingApplicants.length + waiting.length,
    }),
    [officialTenants.length, pendingApplicants.length, waiting.length]
  )

  const filteredProperties = useMemo(() => {
    let list = properties
    if (activeRentalFilter && activeRentalFilter !== 'all') {
      list = list.filter(
        (property) => normalizeRentalType(property.propertyType) === activeRentalFilter
      )
    }
    if (leaseFilter === 'all') return list
    return list.filter((property) => {
      const tenants = tenantsAtProperty(property, clients, getContractForClient)
      return tenants.some((client) =>
        matchesLeaseFilter(parseLeaseLengthMonths(client.leaseLengthMonths), leaseFilter)
      )
    })
  }, [properties, clients, getContractForClient, leaseFilter, activeRentalFilter])

  const filteredOfficialTenants = useMemo(() => {
    return officialTenants.filter((client) =>
      matchesLeaseFilter(parseLeaseLengthMonths(client.leaseLengthMonths), leaseFilter)
    )
  }, [officialTenants, leaseFilter])

  const filteredPending = useMemo(() => {
    if (leaseFilter === 'all') return pendingApplicants
    return pendingApplicants.filter((user) => {
      const client = clients.find((c) => c.id === user.clientId)
      if (client?.leaseLengthMonths == null) return false
      return matchesLeaseFilter(
        parseLeaseLengthMonths(client.leaseLengthMonths),
        leaseFilter
      )
    })
  }, [pendingApplicants, clients, leaseFilter])

  const filteredWaiting = useMemo(() => {
    if (leaseFilter === 'all') return waiting
    return waiting.filter(
      (registration) =>
        registration.preferredLeaseMonths != null &&
        matchesLeaseFilter(registration.preferredLeaseMonths, leaseFilter)
    )
  }, [waiting, leaseFilter])

  const companyName = settings.businessName?.trim() || '—'

  const toggleRentalFilter = (filter: RentalFilter) => {
    setActiveRentalFilter((current) => (current === filter ? null : filter))
    setLeaseFilter('all')
  }

  const toggleRenterGroup = (group: RenterGroup) => {
    setActiveRenterGroup((current) => (current === group ? null : group))
    setLeaseFilter('all')
  }

  const rentalListTitle =
    activeRentalFilter === 'all'
      ? 'All rentals'
      : activeRentalFilter
        ? shortRentalTypeLabel(activeRentalFilter)
        : ''

  const renterListTitle =
    activeRenterGroup === 'all'
      ? 'All renters'
      : activeRenterGroup === 'official'
        ? 'Official tenants'
        : activeRenterGroup === 'pending'
          ? 'Pending tenants'
          : activeRenterGroup === 'waiting'
            ? 'Waiting to connect'
            : ''

  return (
    <Card data-onboarding="admin-company-details">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b-[length:var(--border-width)] border-line pb-3">
        <p className="text-sm text-ink-muted">
          Registered company details and portfolio overview
        </p>
        <Link
          to="/studio/properties"
          className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          Manage rentals
        </Link>
      </div>

      <div className="mb-5">
        <p className="label-caps text-ink-faint">Company name</p>
        <p className="mt-1 font-display text-xl font-semibold text-ink">{companyName}</p>
        <p className="mt-1.5 text-xs text-ink-muted">
          Registered at sign-up and cannot be changed here. Contact support for a special request
          if you need to update it. Add and edit rentals from the Rentals page.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioSection
          icon={Building2}
          title="Rentals"
          total={properties.length}
          selected={activeRentalFilter !== null}
        >
          <div className="flex flex-wrap gap-2">
            <CountChip
              label="All types"
              count={properties.length}
              selected={activeRentalFilter === 'all'}
              onClick={() => toggleRentalFilter('all')}
            />
            {rentalTypeCounts.map(({ type, count }) => (
              <CountChip
                key={type}
                label={shortRentalTypeLabel(type)}
                count={count}
                selected={activeRentalFilter === type}
                onClick={() => toggleRentalFilter(type)}
              />
            ))}
          </div>
          {properties.length === 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              No rentals yet.{' '}
              <Link to="/studio/properties" className="font-semibold text-brand hover:underline">
                Add a rental
              </Link>
            </p>
          )}
        </PortfolioSection>

        <PortfolioSection
          icon={Users}
          title="All Renters"
          total={renterCounts.all}
          selected={activeRenterGroup !== null}
        >
          <div className="flex flex-wrap gap-2">
            <CountChip
              label="All renters"
              count={renterCounts.all}
              selected={activeRenterGroup === 'all'}
              onClick={() => toggleRenterGroup('all')}
              loading={pipelineLoading}
            />
            <CountChip
              label="Official tenants"
              count={renterCounts.official}
              selected={activeRenterGroup === 'official'}
              onClick={() => toggleRenterGroup('official')}
            />
            <CountChip
              label="Pending tenants"
              count={renterCounts.pending}
              selected={activeRenterGroup === 'pending'}
              onClick={() => toggleRenterGroup('pending')}
              loading={pipelineLoading}
            />
            <CountChip
              label="Waiting to connect"
              count={renterCounts.waiting}
              selected={activeRenterGroup === 'waiting'}
              onClick={() => toggleRenterGroup('waiting')}
              loading={pipelineLoading}
            />
          </div>
          {pipelineError && (
            <p className="mt-2 text-xs text-accent" role="alert">
              {pipelineError}
            </p>
          )}
        </PortfolioSection>
      </div>

      {activeRentalFilter !== null && (
        <div className="mt-5 border-t border-line pt-4">
          <DetailHeader
            title={rentalListTitle}
            subtitle="Buildings and units in your portfolio"
            leaseFilter={leaseFilter}
            onLeaseFilterChange={setLeaseFilter}
          />
          <PropertyList
            properties={filteredProperties}
            clients={clients}
            getContractForClient={getContractForClient}
            leaseFilter={leaseFilter}
            emptyForType={
              activeRentalFilter !== 'all' ? shortRentalTypeLabel(activeRentalFilter) : null
            }
          />
        </div>
      )}

      {activeRenterGroup !== null && (
        <div className="mt-5 border-t border-line pt-4">
          <DetailHeader
            title={renterListTitle}
            subtitle={
              activeRenterGroup === 'waiting'
                ? 'New sign-ups waiting for you to accept a connection'
                : activeRenterGroup === 'pending'
                  ? 'Accepted renters who have not signed a lease yet'
                  : activeRenterGroup === 'official'
                    ? 'Active or soon-to-start signed leases'
                    : 'Official, pending, and waiting-to-connect renters'
            }
            leaseFilter={leaseFilter}
            onLeaseFilterChange={setLeaseFilter}
          />
          <RenterDetailList
            group={activeRenterGroup}
            official={filteredOfficialTenants}
            pending={filteredPending}
            waiting={filteredWaiting}
            clients={clients}
            getContractForClient={getContractForClient}
            leaseFilter={leaseFilter}
            loading={pipelineLoading}
          />
        </div>
      )}
    </Card>
  )
}

function PortfolioSection({
  icon: Icon,
  title,
  total,
  selected,
  children,
}: {
  icon: typeof Building2
  title: string
  total: number
  selected: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-sm)] border-2 bg-surface px-4 py-4 transition-colors',
        selected ? 'border-brand bg-brand/10' : 'border-line'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="label-caps text-ink-faint">{title}</p>
        <p className="flex items-center gap-1.5 font-display text-2xl font-semibold text-ink">
          <Icon className="h-5 w-5 text-ink-muted" aria-hidden />
          {total}
        </p>
      </div>
      <p className="mb-3 text-xs text-ink-muted">Click a count to view the list</p>
      {children}
    </div>
  )
}

function CountChip({
  label,
  count,
  selected,
  onClick,
  loading,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-sm)] border-2 px-3 py-2 text-left transition-transform duration-200 ease-out',
        'hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        selected
          ? 'border-brand bg-brand text-surface-paper shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]'
          : 'border-line bg-surface-paper text-ink hover:border-brand/50'
      )}
    >
      <span className={cn('text-xs font-medium', selected ? 'text-surface-paper/90' : 'text-ink-muted')}>
        {label}
      </span>
      <span className="font-display text-lg font-semibold tabular-nums">
        {loading ? '—' : count}
      </span>
    </button>
  )
}

function DetailHeader({
  title,
  subtitle,
  leaseFilter,
  onLeaseFilterChange,
}: {
  title: string
  subtitle: string
  leaseFilter: LeaseDurationFilter
  onLeaseFilterChange: (value: LeaseDurationFilter) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label-caps">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
      </div>
      <div className="w-full sm:w-48">
        <Select
          label="Lease duration"
          value={String(leaseFilter)}
          onChange={(e) => {
            const value = e.target.value
            onLeaseFilterChange(
              value === 'all' ? 'all' : (Number(value) as LeaseDurationFilter)
            )
          }}
        >
          <option value="all">All leases</option>
          {LEASE_LENGTH_OPTIONS.map((months) => (
            <option key={months} value={months}>
              {formatLeaseLengthLabel(months)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

function PropertyList({
  properties,
  clients,
  getContractForClient,
  leaseFilter,
  emptyForType,
}: {
  properties: Property[]
  clients: Client[]
  getContractForClient: GetContract
  leaseFilter: LeaseDurationFilter
  emptyForType: string | null
}) {
  if (properties.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        {leaseFilter === 'all' ? (
          emptyForType ? (
            `No ${emptyForType} rentals in your portfolio.`
          ) : (
            <>
              No rentals yet.{' '}
              <Link to="/studio/properties" className="font-semibold text-brand hover:underline">
                Add a rental
              </Link>{' '}
              to start your portfolio.
            </>
          )
        ) : (
          `No rentals with ${formatLeaseLengthLabel(leaseFilter)} leases.`
        )}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line rounded-[var(--radius-sm)] border border-line">
      {properties.map((property) => {
        const tenants = tenantsAtProperty(property, clients, getContractForClient).filter(
          (client) =>
            matchesLeaseFilter(parseLeaseLengthMonths(client.leaseLengthMonths), leaseFilter)
        )
        return (
          <li key={property.id} className="px-3 py-2.5 text-sm">
            <Link
              to={`/studio/properties?highlight=${encodeURIComponent(property.id)}`}
              className="break-words font-medium text-ink hover:text-brand hover:underline"
            >
              {property.address}
            </Link>
            <p className="mt-0.5 text-xs text-ink-muted">
              {normalizeRentalType(property.propertyType)} · {property.bedrooms}{' '}
              {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · max {property.maxTenants}{' '}
              {property.maxTenants === 1 ? 'tenant' : 'tenants'}
              {tenants.length > 0
                ? ` · ${tenants.length} ${tenants.length === 1 ? 'tenant' : 'tenants'}${
                    leaseFilter === 'all' ? '' : ` on ${formatLeaseLengthLabel(leaseFilter)}`
                  }`
                : ''}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function RenterDetailList({
  group,
  official,
  pending,
  waiting,
  clients,
  getContractForClient,
  leaseFilter,
  loading,
}: {
  group: RenterGroup
  official: Client[]
  pending: PortalUserAccepted[]
  waiting: PendingRegistration[]
  clients: Client[]
  getContractForClient: GetContract
  leaseFilter: LeaseDurationFilter
  loading: boolean
}) {
  const showOfficial = group === 'all' || group === 'official'
  const showPending = group === 'all' || group === 'pending'
  const showWaiting = group === 'all' || group === 'waiting'

  const isEmpty =
    (!showOfficial || official.length === 0) &&
    (!showPending || pending.length === 0) &&
    (!showWaiting || waiting.length === 0)

  if (loading && group !== 'official' && (showPending || showWaiting)) {
    return <p className="text-sm text-ink-muted">Loading renters…</p>
  }

  if (isEmpty) {
    return (
      <p className="text-sm text-ink-muted">
        {leaseFilter === 'all'
          ? 'No renters in this group yet.'
          : `No renters match ${formatLeaseLengthLabel(leaseFilter)} leases.`}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {showOfficial && official.length > 0 && (
        <RenterGroupBlock title={group === 'all' ? 'Official tenants' : undefined}>
          <OfficialTenantList tenants={official} getContractForClient={getContractForClient} />
        </RenterGroupBlock>
      )}
      {showPending && pending.length > 0 && (
        <RenterGroupBlock title={group === 'all' ? 'Pending tenants' : undefined}>
          <PendingRenterList pending={pending} clients={clients} getContractForClient={getContractForClient} />
        </RenterGroupBlock>
      )}
      {showWaiting && waiting.length > 0 && (
        <RenterGroupBlock title={group === 'all' ? 'Waiting to connect' : undefined}>
          <WaitingRenterList waiting={waiting} />
        </RenterGroupBlock>
      )}
    </div>
  )
}

function RenterGroupBlock({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>}
      {children}
    </div>
  )
}

function OfficialTenantList({
  tenants,
  getContractForClient,
}: {
  tenants: Client[]
  getContractForClient: GetContract
}) {
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-sm)] border border-line">
      {tenants.map((tenant) => {
        const months = parseLeaseLengthMonths(tenant.leaseLengthMonths)
        const address = getTenantAddress(tenant, getContractForClient(tenant.id))
        return (
          <li
            key={tenant.id}
            className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <Link
                to={`/studio/clients/${tenant.id}`}
                className="font-medium text-ink hover:text-brand hover:underline"
              >
                {tenant.name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-muted">
                {address || 'No address on file'}
                {tenant.email ? ` · ${tenant.email}` : ''}
              </p>
            </div>
            <span className="shrink-0 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
              {formatLeaseLengthLabel(months)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PendingRenterList({
  pending,
  clients,
  getContractForClient,
}: {
  pending: PortalUserAccepted[]
  clients: Client[]
  getContractForClient: GetContract
}) {
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-sm)] border border-line">
      {pending.map((user) => {
        const client = clients.find((c) => c.id === user.clientId)
        const address =
          user.propertyAddress ||
          (client ? getTenantAddress(client, getContractForClient(client.id)) : '') ||
          'No address on file'
        const months = client?.leaseLengthMonths ?? null
        return (
          <li
            key={user.userId}
            className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
          >
            <div className="min-w-0">
              {user.clientId ? (
                <Link
                  to={`/studio/clients/${user.clientId}`}
                  className="font-medium text-ink hover:text-brand hover:underline"
                >
                  {user.clientName || user.name}
                </Link>
              ) : (
                <p className="font-medium text-ink">{user.clientName || user.name}</p>
              )}
              <p className="mt-0.5 text-xs text-ink-muted">
                {address}
                {user.email ? ` · ${user.email}` : ''}
                {user.contractStatus ? ` · ${user.contractStatus}` : ''}
              </p>
            </div>
            {months != null && (
              <span className="shrink-0 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
                {formatLeaseLengthLabel(parseLeaseLengthMonths(months))}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function WaitingRenterList({ waiting }: { waiting: PendingRegistration[] }) {
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-sm)] border border-line">
      {waiting.map((registration) => (
        <li
          key={registration.id}
          className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium text-ink">{registration.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {registration.preferredPropertyAddress?.trim() || 'No address on file'}
              {registration.email ? ` · ${registration.email}` : ''}
              {registration.createdAt
                ? ` · Registered ${formatDate(registration.createdAt.split('T')[0])}`
                : ''}
            </p>
          </div>
          {registration.preferredLeaseMonths != null && (
            <span className="shrink-0 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
              Prefers {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
