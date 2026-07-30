import type { BusinessSettings, KeyReturnPreferences } from '@/types'
import { formatUsd } from '@/lib/rentalRent'

export const DEFAULT_KEY_RETURN_PREFERENCES: KeyReturnPreferences = {
  autoNotify: true,
  gracePeriodDays: 7,
  fineAmount: 100,
}

const CLAUSE_START = 'Key Return.'

export function getKeyReturnPreferences(
  settings?:
    | Pick<BusinessSettings, 'keyReturn'>
    | { keyReturn?: Partial<KeyReturnPreferences> | null }
    | null
): KeyReturnPreferences {
  const raw = settings?.keyReturn
  const grace = Number(raw?.gracePeriodDays)
  const fine = Number(raw?.fineAmount)
  const custom = String(raw?.clauseWording ?? '').trim()
  return {
    autoNotify: raw?.autoNotify !== false,
    gracePeriodDays:
      Number.isFinite(grace) && grace >= 0
        ? Math.min(365, Math.round(grace))
        : DEFAULT_KEY_RETURN_PREFERENCES.gracePeriodDays,
    fineAmount:
      Number.isFinite(fine) && fine >= 0
        ? Math.round(fine * 100) / 100
        : DEFAULT_KEY_RETURN_PREFERENCES.fineAmount,
    clauseWording: custom || undefined,
  }
}

/** Generated clause from grace days + fine (used when no custom wording is saved). */
export function buildDefaultKeyReturnClause(
  prefs: Pick<KeyReturnPreferences, 'gracePeriodDays' | 'fineAmount'>
): string {
  const days = prefs.gracePeriodDays
  const dayLabel = days === 1 ? '1 day' : `${days} days`
  const fine = formatUsd(prefs.fineAmount)
  return (
    `${CLAUSE_START} Tenant must return keys within ${dayLabel} after lease end. ` +
    `Tenant shall return all keys, access devices, fobs, and remotes to the landlord ` +
    `within the key return grace period. If keys are not returned within the grace period, ` +
    `Tenant may be charged a fine of ${fine}, in addition to any other remedies available ` +
    `under this lease and applicable law.`
  )
}

/** Exact clause appended to lease agreements from landlord preferences. */
export function buildKeyReturnClause(prefs: KeyReturnPreferences): string {
  const custom = prefs.clauseWording?.trim()
  if (custom) {
    return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
  }
  return buildDefaultKeyReturnClause(prefs)
}

export function buildKeyReturnNotificationMessage(prefs: KeyReturnPreferences): string {
  const days = prefs.gracePeriodDays
  const dayLabel = days === 1 ? '1 day' : `${days} days`
  const fine = formatUsd(prefs.fineAmount)
  return (
    `Your lease has ended. Please return all keys, access devices, fobs, and remotes ` +
    `within ${dayLabel} to avoid a ${fine} fine.`
  )
}

export function stripKeyReturnClause(text: string): string {
  const raw = String(text ?? '')
  const idx = raw.indexOf(CLAUSE_START)
  if (idx < 0) return raw.trim()
  return raw.slice(0, idx).trim()
}

/** Replace or append the current key-return clause so editable drafts stay in sync. */
export function withKeyReturnClause(
  existingTerms: string | undefined,
  prefs: KeyReturnPreferences
): string {
  const base = stripKeyReturnClause(existingTerms ?? '')
  const clause = buildKeyReturnClause(prefs)
  return base ? `${base}\n\n${clause}` : clause
}
