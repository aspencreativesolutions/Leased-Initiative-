import {
  countOfficialClients,
  getTenantAddress,
  isLeaseCurrentlyInTerm,
  shouldShowInOfficialTenants,
} from '@/lib/clientUtils'
import { getAddressState } from '@/lib/contractLocationFilters'
import {
  computeLeaseEndDate,
  parseLeaseLengthMonths,
  parseYmd,
  resolveScheduleAsOf,
} from '@/lib/leaseSchedule'
import { PLACEHOLDER_MARKER } from '@/lib/contractPlaceholders'
import type {
  Client,
  ContractData,
  PendingRegistration,
  Property,
} from '@/types'

/** Applicant / pending-tenant interest tied to a rental address. */
export type RentalInterestCounts = {
  applicantCount: number
  pendingTenantCount: number
}

/** Days ahead to surface lease-end openings (includes near-term renewals). */
export const OPENING_HORIZON_DAYS = 180

/** Recently ended leases still shown for re-sign outreach. */
export const OPENING_LOOKBACK_DAYS = 45

export function normalizePropertyAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function addressesMatch(a?: string, b?: string): boolean {
  if (!a?.trim() || !b?.trim()) return false
  return normalizePropertyAddress(a) === normalizePropertyAddress(b)
}

function isUsableLeaseDate(value?: string): value is string {
  if (!value?.trim()) return false
  if (value.includes(PLACEHOLDER_MARKER)) return false
  const parsed = value.includes('T') ? new Date(value) : parseYmd(value.slice(0, 10))
  return !Number.isNaN(parsed.getTime())
}

export function resolveLeaseEndYmd(
  client: Client,
  contract?: ContractData
): string | undefined {
  if (isUsableLeaseDate(contract?.completionDate)) {
    return contract!.completionDate.slice(0, 10)
  }
  const start =
    (isUsableLeaseDate(contract?.startDate) ? contract!.startDate.slice(0, 10) : undefined) ||
    (isUsableLeaseDate(client.demoLeaseStartDate)
      ? client.demoLeaseStartDate!.slice(0, 10)
      : undefined)
  if (!start) return undefined
  const months = parseLeaseLengthMonths(client.leaseLengthMonths)
  return computeLeaseEndDate(start, months)
}

export function tenantsAtProperty(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Client[] {
  return clients.filter((client) => {
    const address = getTenantAddress(client, getContract(client.id))
    return addressesMatch(address, property.address)
  })
}

/** Tenants on currently in-term signed leases at this property. */
export function activeTenantsAtProperty(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Client[] {
  return tenantsAtProperty(property, clients, getContract).filter((client) => {
    if (!client.isOfficialClient) return false
    return isLeaseCurrentlyInTerm(client, getContract(client.id))
  })
}

/**
 * Official Tenants directory occupancy at this rental (upcoming + in-term).
 * Used for applicant “Available Units” badges on Waiting to Connect.
 */
export function officialTenantsAtProperty(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Client[] {
  return tenantsAtProperty(property, clients, getContract).filter((client) =>
    shouldShowInOfficialTenants(client, getContract(client.id))
  )
}

/**
 * Remaining tenant capacity (not open units): max tenants minus active occupancy.
 * Prefer vacantUnitCount / openUnitsForRental for dashboard "Open Units".
 */
export function remainingTenantCapacity(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  const current = activeTenantsAtProperty(property, clients, getContract).length
  return Math.max(0, property.maxTenants - current)
}

/**
 * Available applicant slots from maxTenants minus Official Tenants at the rental.
 * Matches Waiting to Connect “Requesting 1 of N available units” badges.
 */
export function availableUnitsForApplicant(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  const current = officialTenantsAtProperty(property, clients, getContract).length
  return Math.max(0, property.maxTenants - current)
}

/** Resolve a preferred/desired address against the landlord Rentals list. */
export function findPropertyByAddress(
  properties: Property[],
  address?: string
): Property | undefined {
  if (!address?.trim()) return undefined
  return properties.find((property) => addressesMatch(property.address, address))
}

/**
 * Per-rental counts of Waiting-to-Connect applicants and Pending Tenants
 * (accepted, lease not yet signed) matched by property address.
 */
export function rentalInterestByPropertyId(
  properties: Property[],
  registrations: PendingRegistration[],
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Map<string, RentalInterestCounts> {
  const counts = new Map<string, RentalInterestCounts>()
  for (const property of properties) {
    counts.set(property.id, { applicantCount: 0, pendingTenantCount: 0 })
  }

  const bump = (propertyId: string, key: keyof RentalInterestCounts) => {
    const current = counts.get(propertyId)
    if (!current) return
    current[key] += 1
  }

  for (const registration of registrations) {
    const property = findPropertyByAddress(
      properties,
      registration.preferredPropertyAddress
    )
    if (property) bump(property.id, 'applicantCount')
  }

  for (const client of clients) {
    if (client.isOfficialClient) continue
    if (client.contractStatus === 'Signed' || client.contractStatus === 'Completed') {
      continue
    }
    const address = getTenantAddress(client, getContract(client.id))
    const property = findPropertyByAddress(properties, address)
    if (property) bump(property.id, 'pendingTenantCount')
  }

  return counts
}

/** @deprecated Use remainingTenantCapacity — open units are unitCount-based. */
export function openUnitCount(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  return remainingTenantCapacity(property, clients, getContract)
}

/**
 * Unique occupied units among active tenants at this rental.
 * Roommates sharing one address count as one unit. When per-unit records exist
 * later, prefer matching against property.units instead of address uniqueness.
 */
export function occupiedUnitCount(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  const active = activeTenantsAtProperty(property, clients, getContract)
  if (active.length === 0) return 0

  const units = new Set(
    active.map((client) =>
      normalizePropertyAddress(getTenantAddress(client, getContract(client.id)))
    )
  )
  return Math.min(property.unitCount, Math.max(1, units.size))
}

/**
 * Open units from rental unit configuration and active occupancy.
 * Do not confuse with remaining tenant capacity or empty bedrooms.
 */
export function vacantUnitCount(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  return Math.max(0, property.unitCount - occupiedUnitCount(property, clients, getContract))
}

/** Alias used by the Rentals dashboard Open Units column. */
export function openUnitsForRental(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): number {
  return vacantUnitCount(property, clients, getContract)
}

/**
 * Occupied share of leasable units (0 = all open, 1 = fully occupied).
 * Drives Rentals tile color: dark red → green as occupancy rises.
 */
export function rentalOccupancyRatio(openUnits: number, unitCount: number): number {
  const total = Math.max(1, Math.floor(unitCount) || 1)
  const open = Math.max(0, Math.min(Math.floor(openUnits) || 0, total))
  return (total - open) / total
}

/** Visual occupancy bands for rental tiles (red vacancy → green full). */
export type RentalOccupancyTone = 'vacant' | 'low' | 'mid' | 'high' | 'full'

export function rentalOccupancyTone(
  openUnits: number,
  unitCount: number
): RentalOccupancyTone {
  const ratio = rentalOccupancyRatio(openUnits, unitCount)
  if (ratio >= 1) return 'full'
  if (ratio >= 0.75) return 'high'
  if (ratio >= 0.5) return 'mid'
  if (ratio >= 0.25) return 'low'
  return 'vacant'
}

export function rentalOccupancyStatusLabel(
  openUnits: number,
  unitCount: number
): string {
  const tone = rentalOccupancyTone(openUnits, unitCount)
  if (tone === 'full') return 'Fully occupied'
  const total = Math.max(1, Math.floor(unitCount) || 1)
  const open = Math.max(0, Math.min(Math.floor(openUnits) || 0, total))
  const unitLabel = open === 1 ? 'open unit' : 'open units'
  return `${open} of ${total} ${unitLabel}`
}

export interface CompanyPortfolioStats {
  propertyCount: number
  tenantCount: number
  lease6MonthCount: number
  lease12MonthCount: number
  byState: { state: string; count: number }[]
}

export function buildCompanyPortfolioStats(
  properties: Property[],
  clients: Client[],
  _getContract: (clientId: string) => ContractData | undefined
): CompanyPortfolioStats {
  const lease6MonthCount = clients.filter((c) => c.leaseLengthMonths === 6).length
  const lease12MonthCount = clients.filter(
    (c) => (c.leaseLengthMonths ?? 12) === 12
  ).length

  const stateCounts = new Map<string, number>()
  for (const property of properties) {
    const state = getAddressState(property.address) ?? 'Other'
    stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1)
  }
  const byState = [...stateCounts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state))

  return {
    propertyCount: properties.length,
    tenantCount: countOfficialClients(clients),
    lease6MonthCount,
    lease12MonthCount,
    byState,
  }
}

export type OpeningKind = 'vacant' | 'lease_ending'

export interface PropertyOpening {
  id: string
  kind: OpeningKind
  propertyId: string
  address: string
  state: string | null
  bedrooms: number
  unitCount: number
  vacantUnits: number
  /** When kind is lease_ending */
  endDate?: string
  tenantIds: string[]
  tenantNames: string[]
  label: string
}

function daysBetween(from: Date, toYmd: string): number {
  const to = parseYmd(toYmd)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function buildUpcomingOpenings(
  properties: Property[],
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  asOf?: Date
): PropertyOpening[] {
  const effectiveAsOf = resolveScheduleAsOf(asOf)
  const openings: PropertyOpening[] = []

  for (const property of properties) {
    const vacant = vacantUnitCount(property, clients, getContract)
    const tenants = tenantsAtProperty(property, clients, getContract)
    const state = getAddressState(property.address)

    if (vacant > 0) {
      openings.push({
        id: `vacant:${property.id}`,
        kind: 'vacant',
        propertyId: property.id,
        address: property.address,
        state,
        bedrooms: property.bedrooms,
        unitCount: property.unitCount,
        vacantUnits: vacant,
        tenantIds: [],
        tenantNames: [],
        label:
          vacant === 1
            ? '1 vacant unit'
            : `${vacant} vacant units`,
      })
    }

    // Group tenants by exact address for shared-unit re-sign rows
    const byAddress = new Map<string, Client[]>()
    for (const tenant of tenants) {
      const addr = normalizePropertyAddress(
        getTenantAddress(tenant, getContract(tenant.id))
      )
      const list = byAddress.get(addr) ?? []
      list.push(tenant)
      byAddress.set(addr, list)
    }

    for (const group of byAddress.values()) {
      const endDates = group
        .map((t) => resolveLeaseEndYmd(t, getContract(t.id)))
        .filter((d): d is string => Boolean(d))
      if (endDates.length === 0) continue
      const earliest = endDates.sort()[0]
      const days = daysBetween(effectiveAsOf, earliest)
      if (days > OPENING_HORIZON_DAYS || days < -OPENING_LOOKBACK_DAYS) continue

      const names = group.map((t) => t.name)
      const timing =
        days < 0
          ? `Lease ended ${formatRelativeDays(days)}`
          : days === 0
            ? 'Lease ends today'
            : `Lease ends in ${days} day${days === 1 ? '' : 's'}`

      openings.push({
        id: `ending:${property.id}:${group.map((t) => t.id).sort().join('+')}`,
        kind: 'lease_ending',
        propertyId: property.id,
        address: property.address,
        state,
        bedrooms: property.bedrooms,
        unitCount: property.unitCount,
        vacantUnits: vacant,
        endDate: earliest,
        tenantIds: group.map((t) => t.id),
        tenantNames: names,
        label: timing,
      })
    }
  }

  return openings.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'lease_ending' ? -1 : 1
    if (a.endDate && b.endDate) return a.endDate.localeCompare(b.endDate)
    return a.address.localeCompare(b.address)
  })
}

function formatRelativeDays(days: number): string {
  const abs = Math.abs(days)
  if (abs === 0) return 'today'
  if (abs === 1) return days < 0 ? 'yesterday' : 'tomorrow'
  return days < 0 ? `${abs} days ago` : `in ${abs} days`
}
