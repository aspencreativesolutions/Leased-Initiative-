export const DEFAULT_KEY_RETURN_PREFERENCES = {
  autoNotify: true,
  gracePeriodDays: 7,
  fineAmount: 100,
}

const CLAUSE_START = 'Key Return.'

function formatUsd(amount) {
  if (amount == null || !Number.isFinite(amount)) return '$0'
  const rounded = Math.round(amount)
  return `$${rounded.toLocaleString('en-US')}`
}

export function getKeyReturnPreferences(settings) {
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

export function buildDefaultKeyReturnClause(prefs) {
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

export function buildKeyReturnClause(prefs) {
  const custom = String(prefs?.clauseWording ?? '').trim()
  if (custom) {
    return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
  }
  return buildDefaultKeyReturnClause(prefs)
}

export function buildKeyReturnNotificationMessage(prefs) {
  const days = prefs.gracePeriodDays
  const dayLabel = days === 1 ? '1 day' : `${days} days`
  const fine = formatUsd(prefs.fineAmount)
  return (
    `Your lease has ended. Please return all keys, access devices, fobs, and remotes ` +
    `within ${dayLabel} to avoid a ${fine} fine.`
  )
}

export function stripKeyReturnClause(text) {
  const raw = String(text ?? '')
  const idx = raw.indexOf(CLAUSE_START)
  if (idx < 0) return raw.trim()
  return raw.slice(0, idx).trim()
}

export function withKeyReturnClause(existingTerms, prefs) {
  const base = stripKeyReturnClause(existingTerms ?? '')
  const clause = buildKeyReturnClause(prefs)
  return base ? `${base}\n\n${clause}` : clause
}

/** True when an official tenant’s lease end date has passed and they are not archived. */
export function isLeaseCompleteForKeyReturn(client, contract, asOf = new Date()) {
  if (!client?.isOfficialClient || client.archivedAt?.trim()) return false
  const end = String(contract?.completionDate ?? '').trim()
  if (!end) return false
  const endDay = new Date(`${end}T00:00:00`)
  if (Number.isNaN(endDay.getTime())) return false
  const today = new Date(asOf)
  today.setHours(0, 0, 0, 0)
  return endDay.getTime() < today.getTime()
}
