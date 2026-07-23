import {
  contractMatchesLocationFilter,
  getAddressState,
  getPhoneAreaCode,
  uniqueSorted,
} from '@/lib/contractLocationFilters'
import { getTenantAddress } from '@/lib/clientUtils'
import {
  compareOfficialTenantLocationSortKeys,
  getOfficialTenantLocationSortKey,
  getTenantAssignedProperty,
  type OfficialTenantLocationDisplayMode,
} from '@/lib/officialTenantLocationDisplay'
import type { Client, ContractData, ContractRegion, Property } from '@/types'

export type OfficialTenantSortMode = 'officialDate' | 'address'

export type OfficialTenantAddressFocus =
  | { kind: 'all' }
  | { kind: 'state'; value: string }
  | { kind: 'region'; value: string }
  | { kind: 'property'; value: string }

export type OfficialTenantSort =
  | { mode: 'officialDate' }
  | { mode: 'address'; focus: OfficialTenantAddressFocus }

export function encodeAddressFocus(focus: OfficialTenantAddressFocus): string {
  if (focus.kind === 'all') return 'all'
  return `${focus.kind}:${encodeURIComponent(focus.value)}`
}

export function parseAddressFocus(raw: string): OfficialTenantAddressFocus {
  if (!raw || raw === 'all') return { kind: 'all' }
  const sep = raw.indexOf(':')
  if (sep <= 0) return { kind: 'all' }
  const kind = raw.slice(0, sep)
  let value = raw.slice(sep + 1)
  if (!value) return { kind: 'all' }
  try {
    value = decodeURIComponent(value)
  } catch {
    /* keep raw value */
  }
  if (kind === 'state' || kind === 'region' || kind === 'property') {
    return { kind, value }
  }
  return { kind: 'all' }
}

export function getOfficialClientSinceMs(client: Client): number {
  const raw = client.officialClientSince || client.createdAt
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? 0 : t
}

type TenantLocationRow = {
  client: Client
  address: string
  state: string | null
  areaCode: string | null
  lat: number | null
  lng: number | null
  locationSortKey: string
}

function buildLocationRows(
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  properties: Property[] = [],
  locationDisplayMode: OfficialTenantLocationDisplayMode = 'address'
): TenantLocationRow[] {
  return clients.map((client) => {
    const contract = getContract(client.id)
    const address = getTenantAddress(client, contract)
    const usableAddress = address === '—' ? '' : address
    const property = getTenantAssignedProperty(client, contract, properties)
    return {
      client,
      address,
      state: getAddressState(usableAddress),
      areaCode: getPhoneAreaCode(client.phone ?? contract?.phone),
      lat: property?.addressDetails?.lat ?? null,
      lng: property?.addressDetails?.lng ?? null,
      locationSortKey: getOfficialTenantLocationSortKey(property, locationDisplayMode),
    }
  })
}

export function buildOfficialTenantAddressOptions(
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  regions: ContractRegion[],
  properties: Property[] = []
): {
  states: string[]
  regions: { id: string; name: string }[]
  properties: string[]
} {
  const rows = buildLocationRows(clients, getContract, properties)
  const states = uniqueSorted(rows.map((row) => row.state))
  const propertyAddresses = uniqueSorted(
    rows.map((row) => (row.address !== '—' ? row.address : null))
  )
  const matchingRegions = regions
    .filter((region) =>
      rows.some((row) =>
        contractMatchesLocationFilter(
          {
            areaCode: row.areaCode,
            state: row.state,
            lat: row.lat,
            lng: row.lng,
          },
          { kind: 'region', value: region.id },
          regions
        )
      )
    )
    .map((region) => ({ id: region.id, name: region.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  return { states, regions: matchingRegions, properties: propertyAddresses }
}

export interface SortOfficialTenantsOptions {
  properties?: Property[]
  locationDisplayMode?: OfficialTenantLocationDisplayMode
}

/** Rearrange official tenants by signed/official date or address focus. */
export function sortOfficialTenants(
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  regions: ContractRegion[],
  sort: OfficialTenantSort,
  options: SortOfficialTenantsOptions = {}
): Client[] {
  if (clients.length <= 1) return clients

  if (sort.mode === 'officialDate') {
    return [...clients].sort(
      (a, b) => getOfficialClientSinceMs(b) - getOfficialClientSinceMs(a)
    )
  }

  const locationDisplayMode = options.locationDisplayMode ?? 'address'
  const rows = buildLocationRows(
    clients,
    getContract,
    options.properties ?? [],
    locationDisplayMode
  )
  const { focus } = sort

  return rows
    .map((row) => {
      let rank = 0
      if (focus.kind === 'state') {
        rank = row.state === focus.value ? 0 : 1
      } else if (focus.kind === 'region') {
        const match = contractMatchesLocationFilter(
          {
            areaCode: row.areaCode,
            state: row.state,
            lat: row.lat,
            lng: row.lng,
          },
          { kind: 'region', value: focus.value },
          regions
        )
        rank = match ? 0 : 1
      } else if (focus.kind === 'property') {
        rank = row.address === focus.value ? 0 : 1
      }
      return { ...row, rank }
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      const byLocation = compareOfficialTenantLocationSortKeys(
        a.locationSortKey,
        b.locationSortKey,
        locationDisplayMode
      )
      if (byLocation !== 0) return byLocation
      return a.client.name.localeCompare(b.client.name, undefined, {
        sensitivity: 'base',
      })
    })
    .map((row) => row.client)
}
