import type { BusinessSettings, TenantPhotoPreferences } from '@/types'

export const DEFAULT_TENANT_PHOTO_PREFERENCES: TenantPhotoPreferences = {
  required: true,
}

const CLAUSE_START = 'Tenant Photo.'

export const DEFAULT_TENANT_PHOTO_CLAUSE =
  `${CLAUSE_START} Tenant must upload a clear photo of themselves in Shared Files ` +
  `for landlord records before move-in.`

export function getTenantPhotoPreferences(
  settings?:
    | Pick<BusinessSettings, 'tenantPhoto'>
    | { tenantPhoto?: Partial<TenantPhotoPreferences> | null }
    | null
): TenantPhotoPreferences {
  const raw = settings?.tenantPhoto
  const custom = String(raw?.clauseWording ?? '').trim()
  return {
    required: raw?.required !== false,
    clauseWording: custom || undefined,
  }
}

export function buildTenantPhotoClause(prefs: TenantPhotoPreferences): string {
  if (!prefs.required) return ''
  const custom = prefs.clauseWording?.trim()
  if (custom) {
    return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
  }
  return DEFAULT_TENANT_PHOTO_CLAUSE
}

export function stripTenantPhotoClause(text: string): string {
  const raw = String(text ?? '')
  const idx = raw.indexOf(CLAUSE_START)
  if (idx < 0) return raw.trim()
  return raw.slice(0, idx).trim()
}

/** Append or remove the tenant-photo clause so editable drafts stay in sync. */
export function withTenantPhotoClause(
  existingTerms: string | undefined,
  prefs: TenantPhotoPreferences
): string {
  const base = stripTenantPhotoClause(existingTerms ?? '')
  if (!prefs.required) return base
  const clause = buildTenantPhotoClause(prefs)
  return base ? `${base}\n\n${clause}` : clause
}

export function isImageMimeType(mimeType: string | undefined | null): boolean {
  const mime = String(mimeType ?? '').toLowerCase()
  return mime.startsWith('image/')
}
