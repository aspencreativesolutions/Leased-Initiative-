import { getTenantAddress } from '@/lib/clientUtils'
import { findPropertyByAddress } from '@/lib/properties'
import type { Client, ContractData, Property } from '@/types'

export const OFFICIAL_TENANT_LOCATION_DISPLAY_KEY =
  'leased-official-tenant-location-display'

export type OfficialTenantLocationDisplayMode =
  | 'address'
  | 'street'
  | 'city'
  | 'state'
  | 'zip'

export const OFFICIAL_TENANT_LOCATION_DISPLAY_ORDER: OfficialTenantLocationDisplayMode[] =
  ['address', 'street', 'city', 'state', 'zip']

export const OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS: Record<
  OfficialTenantLocationDisplayMode,
  string
> = {
  address: 'Address',
  street: 'Address · Street',
  city: 'Address · City',
  state: 'Address · State',
  zip: 'Address · ZIP',
}

export const LOCATION_DISPLAY_MISSING = 'Not available'

const MODE_SET = new Set<string>(OFFICIAL_TENANT_LOCATION_DISPLAY_ORDER)

export function isOfficialTenantLocationDisplayMode(
  value: unknown
): value is OfficialTenantLocationDisplayMode {
  return typeof value === 'string' && MODE_SET.has(value)
}

export function loadOfficialTenantLocationDisplayMode(): OfficialTenantLocationDisplayMode {
  try {
    const raw = sessionStorage.getItem(OFFICIAL_TENANT_LOCATION_DISPLAY_KEY)
    if (isOfficialTenantLocationDisplayMode(raw)) return raw
  } catch {
    /* sessionStorage unavailable */
  }
  return 'address'
}

export function saveOfficialTenantLocationDisplayMode(
  mode: OfficialTenantLocationDisplayMode
): void {
  try {
    sessionStorage.setItem(OFFICIAL_TENANT_LOCATION_DISPLAY_KEY, mode)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function cycleOfficialTenantLocationDisplayMode(
  mode: OfficialTenantLocationDisplayMode
): OfficialTenantLocationDisplayMode {
  const index = OFFICIAL_TENANT_LOCATION_DISPLAY_ORDER.indexOf(mode)
  const next = (index + 1) % OFFICIAL_TENANT_LOCATION_DISPLAY_ORDER.length
  return OFFICIAL_TENANT_LOCATION_DISPLAY_ORDER[next]
}

function usableField(value?: string): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Assigned rental for a tenant row, matched by lease/project address. */
export function getTenantAssignedProperty(
  client: Client,
  contract: ContractData | undefined,
  properties: Property[]
): Property | undefined {
  const address = getTenantAddress(client, contract)
  if (!address || address === '—') return undefined
  return findPropertyByAddress(properties, address)
}

/**
 * Structured location value for the active display mode.
 * Uses rental `address` / `addressDetails` — never parses a formatted string.
 */
export function getOfficialTenantLocationDisplayValue(
  property: Property | undefined,
  mode: OfficialTenantLocationDisplayMode
): string {
  if (!property) return LOCATION_DISPLAY_MISSING

  switch (mode) {
    case 'address':
      return usableField(property.address) ?? LOCATION_DISPLAY_MISSING
    case 'street':
      return usableField(property.addressDetails?.street) ?? LOCATION_DISPLAY_MISSING
    case 'city':
      return usableField(property.addressDetails?.city) ?? LOCATION_DISPLAY_MISSING
    case 'state': {
      const state = usableField(property.addressDetails?.state)
      return state ? state.toUpperCase() : LOCATION_DISPLAY_MISSING
    }
    case 'zip':
      return usableField(property.addressDetails?.zip) ?? LOCATION_DISPLAY_MISSING
  }
}

/** Sort key for the active location mode; missing values sort last. */
export function getOfficialTenantLocationSortKey(
  property: Property | undefined,
  mode: OfficialTenantLocationDisplayMode
): string {
  const display = getOfficialTenantLocationDisplayValue(property, mode)
  if (display === LOCATION_DISPLAY_MISSING) return ''
  return display
}

export function compareOfficialTenantLocationSortKeys(
  a: string,
  b: string,
  mode: OfficialTenantLocationDisplayMode
): number {
  const aMissing = !a
  const bMissing = !b
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  if (mode === 'zip') {
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      const byNum = Number(a) - Number(b)
      if (byNum !== 0) return byNum
    }
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}
