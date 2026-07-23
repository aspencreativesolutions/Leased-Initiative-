import type { Client, ContractData, ContractRegion, ContractRegionRadius } from '@/types'
import { getTenantAddress } from '@/lib/clientUtils'

export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

const US_STATE_CODES = new Set(US_STATES.map((state) => state.code))

const US_STATE_NAME_BY_CODE = Object.fromEntries(
  US_STATES.map((state) => [state.code, state.name])
) as Record<string, string>

const EARTH_RADIUS_MILES = 3958.7613

/** Full US state name for a 2-letter code, or the code itself if unknown. */
export function formatStateName(code: string): string {
  const normalized = code.trim().toUpperCase()
  return US_STATE_NAME_BY_CODE[normalized] ?? normalized
}

export type ContractLocationFilterKind = 'areaCode' | 'state' | 'region'

export interface ContractLocationFilter {
  kind: ContractLocationFilterKind | null
  value: string
}

export interface ContractLocationMeta {
  areaCode: string | null
  state: string | null
  /** Optional coordinates for radius region matching */
  lat?: number | null
  lng?: number | null
}

/** Extract a 3-digit US area code from a phone string */
export function getPhoneAreaCode(phone?: string): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1, 4)
  }
  if (digits.length >= 10) {
    return digits.slice(0, 3)
  }
  if (digits.length === 3) return digits
  return null
}

/**
 * Parse a US state abbreviation from a free-text address.
 * Matches patterns like "City, NY 10001" or "…, CA".
 */
export function getAddressState(address?: string): string | null {
  if (!address?.trim()) return null
  const withZip = address.match(/,\s*([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\b/)
  if (withZip) {
    const code = withZip[1].toUpperCase()
    if (US_STATE_CODES.has(code)) return code
  }
  const trailing = address.match(/,\s*([A-Za-z]{2})\s*$/)
  if (trailing) {
    const code = trailing[1].toUpperCase()
    if (US_STATE_CODES.has(code)) return code
  }
  return null
}

export function getContractLocationMeta(
  client: Client | undefined,
  contract: ContractData
): {
  address: string
  tenantName: string
  areaCode: string | null
  state: string | null
} {
  const address = client
    ? getTenantAddress(client, contract)
    : contract.clientAddress?.trim() || '—'
  const tenantName = client?.name ?? contract.clientName
  const phone = client?.phone ?? contract.phone
  return {
    address,
    tenantName,
    areaCode: getPhoneAreaCode(phone),
    state: getAddressState(address === '—' ? '' : address),
  }
}

/** Great-circle distance in miles between two WGS84 points. */
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function isValidRegionRadius(
  radius: ContractRegionRadius | undefined | null
): boolean {
  if (!radius) return false
  return (
    Number.isFinite(radius.lat) &&
    Number.isFinite(radius.lng) &&
    Number.isFinite(radius.miles) &&
    radius.miles > 0 &&
    Math.abs(radius.lat) <= 90 &&
    Math.abs(radius.lng) <= 180
  )
}

export function regionHasCriteria(region: ContractRegion): boolean {
  return (
    region.areaCodes.length > 0 ||
    region.states.length > 0 ||
    isValidRegionRadius(region.radius)
  )
}

export function pointMatchesRegionRadius(
  point: { lat: number; lng: number } | null | undefined,
  radius: ContractRegionRadius | undefined | null
): boolean {
  if (!isValidRegionRadius(radius) || !radius) return false
  if (
    point == null ||
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lng)
  ) {
    return false
  }
  return distanceMiles(point, { lat: radius.lat, lng: radius.lng }) <= radius.miles
}

export function contractMatchesLocationFilter(
  meta: ContractLocationMeta,
  filter: ContractLocationFilter,
  regions: ContractRegion[]
): boolean {
  if (!filter.kind || !filter.value) return true

  if (filter.kind === 'areaCode') {
    return meta.areaCode === filter.value
  }

  if (filter.kind === 'state') {
    return meta.state === filter.value
  }

  const region = regions.find((r) => r.id === filter.value)
  if (!region) return true

  const areaMatch =
    region.areaCodes.length > 0 &&
    Boolean(meta.areaCode && region.areaCodes.includes(meta.areaCode))
  const stateMatch =
    region.states.length > 0 && Boolean(meta.state && region.states.includes(meta.state))
  const radiusMatch = pointMatchesRegionRadius(
    meta.lat != null && meta.lng != null ? { lat: meta.lat, lng: meta.lng } : null,
    region.radius
  )

  if (!regionHasCriteria(region)) return false
  return areaMatch || stateMatch || radiusMatch
}

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort()
}

export function normalizeAreaCodeList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((part) => part.replace(/\D/g, ''))
        .filter((part) => part.length === 3)
    ),
  ].sort()
}

export function normalizeStateList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((part) => part.trim().toUpperCase())
        .filter((part) => US_STATE_CODES.has(part))
    ),
  ].sort()
}

export function formatRadiusMiles(miles: number): string {
  return miles >= 10
    ? String(Math.round(miles))
    : miles.toFixed(1).replace(/\.0$/, '')
}

export function formatRegionRadiusSummary(radius: ContractRegionRadius): string {
  const miles = formatRadiusMiles(radius.miles)
  const label = radius.label?.trim()
  if (label) return `${miles}-mile radius around ${label}`
  return `${miles}-mile radius`
}

/** Bullet lines for the live “This group includes” panel. */
export function formatGroupCriteriaLines(group: Pick<
  ContractRegion,
  'areaCodes' | 'states' | 'radius'
>): string[] {
  const lines: string[] = []
  for (const state of group.states) {
    lines.push(formatStateName(state))
  }
  if (group.areaCodes.length === 1) {
    lines.push(`Area Code ${group.areaCodes[0]}`)
  } else if (group.areaCodes.length > 1) {
    lines.push(`Area Codes: ${group.areaCodes.join(', ')}`)
  }
  if (isValidRegionRadius(group.radius) && group.radius) {
    lines.push(formatRegionRadiusSummary(group.radius))
  }
  return lines
}

/** Compact card summary, e.g. “Ohio + 439 Area Code + 15-mile radius”. */
export function formatGroupCriteriaSummary(group: Pick<
  ContractRegion,
  'areaCodes' | 'states' | 'radius'
>): string {
  const parts: string[] = []
  for (const state of group.states) {
    parts.push(formatStateName(state))
  }
  if (group.areaCodes.length === 1) {
    parts.push(`${group.areaCodes[0]} Area Code`)
  } else if (group.areaCodes.length > 1) {
    parts.push(`Area Codes ${group.areaCodes.join(', ')}`)
  }
  if (isValidRegionRadius(group.radius) && group.radius) {
    parts.push(formatRegionRadiusSummary(group.radius))
  }
  return parts.join(' + ')
}
