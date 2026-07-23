import { useMemo, useState } from 'react'
import { Building2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { getTenantAddress } from '@/lib/clientUtils'
import {
  formatLeaseLengthLabel,
  LEASE_LENGTH_OPTIONS,
  parseLeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { buildCompanyPortfolioStats, tenantsAtProperty } from '@/lib/properties'
import { cn } from '@/lib/utils'
import type { Client, ContractData, Property } from '@/types'

type PortfolioTile = 'properties' | 'tenants'
type LeaseDurationFilter = 'all' | (typeof LEASE_LENGTH_OPTIONS)[number]
type GetContract = (clientId: string) => ContractData | undefined

function matchesLeaseFilter(months: number, filter: LeaseDurationFilter): boolean {
  if (filter === 'all') return true
  return months === filter
}

export function CompanyDetailsPanel() {
  const { settings, properties, clients, getContractForClient } = useApp()
  const [activeTile, setActiveTile] = useState<PortfolioTile | null>(null)
  const [leaseFilter, setLeaseFilter] = useState<LeaseDurationFilter>('all')

  const stats = useMemo(
    () => buildCompanyPortfolioStats(properties, clients, getContractForClient),
    [properties, clients, getContractForClient]
  )

  const officialTenants = useMemo(
    () => clients.filter((c) => c.isOfficialClient),
    [clients]
  )

  const filteredTenants = useMemo(() => {
    return officialTenants.filter((client) =>
      matchesLeaseFilter(parseLeaseLengthMonths(client.leaseLengthMonths), leaseFilter)
    )
  }, [officialTenants, leaseFilter])

  const filteredProperties = useMemo(() => {
    if (leaseFilter === 'all') return properties
    return properties.filter((property) => {
      const tenants = tenantsAtProperty(property, clients, getContractForClient)
      return tenants.some((client) =>
        matchesLeaseFilter(parseLeaseLengthMonths(client.leaseLengthMonths), leaseFilter)
      )
    })
  }, [properties, clients, getContractForClient, leaseFilter])

  const companyName = settings.businessName?.trim() || '—'

  const toggleTile = (tile: PortfolioTile) => {
    setActiveTile((current) => (current === tile ? null : tile))
    setLeaseFilter('all')
  }

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

      <div className="grid gap-3 sm:grid-cols-2">
        <PortfolioTileButton
          icon={Building2}
          label="Rentals"
          value={String(stats.propertyCount)}
          selected={activeTile === 'properties'}
          onClick={() => toggleTile('properties')}
        />
        <PortfolioTileButton
          icon={Users}
          label="Tenants"
          value={String(stats.tenantCount)}
          selected={activeTile === 'tenants'}
          onClick={() => toggleTile('tenants')}
        />
      </div>

      {activeTile && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label-caps">
                {activeTile === 'properties' ? 'Rentals' : 'Tenants'}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {activeTile === 'properties'
                  ? 'Buildings and units in your portfolio'
                  : 'Official tenants linked to your leases'}
              </p>
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Lease duration"
                value={String(leaseFilter)}
                onChange={(e) => {
                  const value = e.target.value
                  setLeaseFilter(
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

          {activeTile === 'properties' ? (
            <PropertyList
              properties={filteredProperties}
              clients={clients}
              getContractForClient={getContractForClient}
              leaseFilter={leaseFilter}
            />
          ) : (
            <TenantList tenants={filteredTenants} getContractForClient={getContractForClient} />
          )}
        </div>
      )}
    </Card>
  )
}

function PortfolioTileButton({
  icon: Icon,
  label,
  value,
  selected,
  onClick,
}: {
  icon: typeof Building2
  label: string
  value: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-[var(--radius-sm)] border-2 bg-surface px-4 py-4 text-left transition-transform duration-200 ease-out',
        'hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        selected
          ? 'border-brand bg-brand/10 shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]'
          : 'border-line hover:border-brand/50'
      )}
    >
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="mt-1.5 flex items-center gap-2 font-display text-3xl font-semibold text-ink">
        <Icon className="h-6 w-6 text-ink-muted" aria-hidden />
        {value}
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        {selected ? 'Click to hide list' : 'Click to view list'}
      </p>
    </button>
  )
}

function PropertyList({
  properties,
  clients,
  getContractForClient,
  leaseFilter,
}: {
  properties: Property[]
  clients: Client[]
  getContractForClient: GetContract
  leaseFilter: LeaseDurationFilter
}) {
  if (properties.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        {leaseFilter === 'all' ? (
          <>
            No rentals yet.{' '}
            <Link to="/studio/properties" className="font-semibold text-brand hover:underline">
              Add a rental
            </Link>{' '}
            to start your portfolio.
          </>
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
            <p className="break-words font-medium text-ink">{property.address}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {property.propertyType} · {property.bedrooms}{' '}
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

function TenantList({
  tenants,
  getContractForClient,
}: {
  tenants: Client[]
  getContractForClient: GetContract
}) {
  if (tenants.length === 0) {
    return <p className="text-sm text-ink-muted">No tenants match this lease duration filter.</p>
  }

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
              <p className="font-medium text-ink">{tenant.name}</p>
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
