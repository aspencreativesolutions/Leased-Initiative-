import type { Client } from '@/types'

export const OFFICIAL_TENANT_CONTACT_DISPLAY_KEY =
  'leased-official-tenant-contact-display'

export type OfficialTenantContactDisplayMode = 'email' | 'phone'

export const OFFICIAL_TENANT_CONTACT_DISPLAY_ORDER: OfficialTenantContactDisplayMode[] =
  ['email', 'phone']

export const OFFICIAL_TENANT_CONTACT_DISPLAY_LABELS: Record<
  OfficialTenantContactDisplayMode,
  string
> = {
  email: 'Contact',
  phone: 'Contact',
}

export const CONTACT_DISPLAY_MISSING = 'Not available'

const MODE_SET = new Set<string>(OFFICIAL_TENANT_CONTACT_DISPLAY_ORDER)

export function isOfficialTenantContactDisplayMode(
  value: unknown
): value is OfficialTenantContactDisplayMode {
  return typeof value === 'string' && MODE_SET.has(value)
}

export function loadOfficialTenantContactDisplayMode(): OfficialTenantContactDisplayMode {
  try {
    const raw = sessionStorage.getItem(OFFICIAL_TENANT_CONTACT_DISPLAY_KEY)
    if (isOfficialTenantContactDisplayMode(raw)) return raw
  } catch {
    /* sessionStorage unavailable */
  }
  return 'email'
}

export function saveOfficialTenantContactDisplayMode(
  mode: OfficialTenantContactDisplayMode
): void {
  try {
    sessionStorage.setItem(OFFICIAL_TENANT_CONTACT_DISPLAY_KEY, mode)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function cycleOfficialTenantContactDisplayMode(
  mode: OfficialTenantContactDisplayMode
): OfficialTenantContactDisplayMode {
  const index = OFFICIAL_TENANT_CONTACT_DISPLAY_ORDER.indexOf(mode)
  const next = (index + 1) % OFFICIAL_TENANT_CONTACT_DISPLAY_ORDER.length
  return OFFICIAL_TENANT_CONTACT_DISPLAY_ORDER[next]
}

function usableField(value?: string): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Email or phone for the Official Tenants Contact column. */
export function getOfficialTenantContactDisplayValue(
  client: Client,
  mode: OfficialTenantContactDisplayMode
): string {
  if (mode === 'phone') {
    return usableField(client.phone) ?? CONTACT_DISPLAY_MISSING
  }
  return usableField(client.email) ?? CONTACT_DISPLAY_MISSING
}
