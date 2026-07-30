/** Session-persisted Official Tenants spotlight after lease-import adds. */

const STORAGE_KEY = 'official-tenant-spotlight-ids'
const HIGHLIGHT_MS = 2800

export const OFFICIAL_TENANT_SPOTLIGHT_MS = HIGHLIGHT_MS

export function officialTenantRowAnchorId(clientId: string): string {
  return `official-tenant-row-${clientId}`
}

export function officialTenantTileAnchorId(clientId: string): string {
  return `official-tenant-tile-${clientId}`
}

/** Prefer the currently visible tile or spreadsheet row. */
export function scrollOfficialTenantIntoView(clientId: string): void {
  const tile = document.getElementById(officialTenantTileAnchorId(clientId))
  const row = document.getElementById(officialTenantRowAnchorId(clientId))
  const isVisible = (el: HTMLElement | null) =>
    Boolean(el && el.getClientRects().length > 0)
  const el =
    (isVisible(tile) && tile) ||
    (isVisible(row) && row) ||
    tile ||
    row
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function readOfficialTenantSpotlightIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  } catch {
    return []
  }
}

export function writeOfficialTenantSpotlightIds(ids: string[]): void {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
  try {
    if (unique.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
  } catch {
    /* ignore quota / private mode */
  }
}

export function parseOfficialTenantHighlightParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )
}

export function buildOfficialTenantHighlightQuery(ids: string[]): string {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
  return unique.length ? `highlight=${encodeURIComponent(unique.join(','))}` : ''
}
