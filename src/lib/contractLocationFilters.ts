import type { Client, ContractData, ContractRegion } from '@/types'
import { getTenantAddress } from '@/lib/clientUtils'

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
])

export type ContractLocationFilterKind = 'areaCode' | 'state' | 'region'

export interface ContractLocationFilter {
  kind: ContractLocationFilterKind | null
  value: string
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
): { address: string; tenantName: string; areaCode: string | null; state: string | null } {
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

export function contractMatchesLocationFilter(
  meta: { areaCode: string | null; state: string | null },
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
  if (region.areaCodes.length === 0 && region.states.length === 0) return false
  return areaMatch || stateMatch
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
