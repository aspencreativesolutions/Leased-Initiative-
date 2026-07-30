import type { ApplicantPartyType, CoupleCompanion } from '@/types'

export const APPLICANT_PARTY_LABELS: Record<ApplicantPartyType, string> = {
  solo: 'Solo',
  couple: 'Couple',
}

export function normalizeApplicantPartyType(
  value: unknown
): ApplicantPartyType | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'solo' || raw === 'single') return 'solo'
  if (raw === 'couple' || raw === 'pair') return 'couple'
  return null
}

export function applicantPartyLabel(
  value: ApplicantPartyType | string | null | undefined
): string | null {
  const canonical = normalizeApplicantPartyType(value)
  return canonical ? APPLICANT_PARTY_LABELS[canonical] : null
}

/** People count for occupancy: couple registrations count as two. */
export function occupantHeadcount(
  occupant: { applicantPartyType?: ApplicantPartyType | string | null } | null | undefined
): number {
  return normalizeApplicantPartyType(occupant?.applicantPartyType) === 'couple' ? 2 : 1
}

export function isCoupleCompanionComplete(
  companion: Partial<CoupleCompanion> | null | undefined
): boolean {
  if (!companion) return false
  const name = String(companion.name ?? '').trim()
  const email = String(companion.email ?? '').trim()
  const phone = String(companion.phone ?? '').replace(/\D/g, '')
  return Boolean(name) && (Boolean(email) || phone.length >= 10)
}

/** Normalize companion payload from forms / API bodies. */
export function normalizeCoupleCompanion(
  value: unknown
): CoupleCompanion | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const name = String(raw.name ?? '').trim()
  if (!name) return null
  const email = String(raw.email ?? '').trim()
  const phone = String(raw.phone ?? '').trim()
  const companion: CoupleCompanion = { name }
  if (email) companion.email = email
  if (phone) companion.phone = phone
  return companion
}
