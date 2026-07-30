/**
 * Solo vs couple registration helpers (mirrors src/lib/applicantParty.ts).
 */

export function normalizeApplicantPartyType(value) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'solo' || raw === 'single') return 'solo'
  if (raw === 'couple' || raw === 'pair') return 'couple'
  return null
}

export function occupantHeadcount(occupant) {
  return normalizeApplicantPartyType(occupant?.applicantPartyType) === 'couple' ? 2 : 1
}

export function isCoupleCompanionComplete(companion) {
  if (!companion) return false
  const name = String(companion.name ?? '').trim()
  const email = String(companion.email ?? '').trim()
  const phone = String(companion.phone ?? '').replace(/\D/g, '')
  return Boolean(name) && (Boolean(email) || phone.length >= 10)
}

export function normalizeCoupleCompanion(value) {
  if (!value || typeof value !== 'object') return null
  const name = String(value.name ?? '').trim()
  if (!name) return null
  const email = String(value.email ?? '').trim()
  const phone = String(value.phone ?? '').trim()
  const companion = { name }
  if (email) companion.email = email
  if (phone) companion.phone = phone
  return companion
}
