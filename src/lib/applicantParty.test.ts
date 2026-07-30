import { describe, expect, it } from 'vitest'
import {
  applicantPartyLabel,
  isCoupleCompanionComplete,
  normalizeApplicantPartyType,
  normalizeCoupleCompanion,
  occupantHeadcount,
} from '@/lib/applicantParty'

describe('applicantParty', () => {
  it('normalizes solo and couple', () => {
    expect(normalizeApplicantPartyType('solo')).toBe('solo')
    expect(normalizeApplicantPartyType('Couple')).toBe('couple')
    expect(normalizeApplicantPartyType('nope')).toBeNull()
  })

  it('labels party types', () => {
    expect(applicantPartyLabel('solo')).toBe('Solo')
    expect(applicantPartyLabel('couple')).toBe('Couple')
  })

  it('counts couple registrations as two people', () => {
    expect(occupantHeadcount({ applicantPartyType: 'solo' })).toBe(1)
    expect(occupantHeadcount({ applicantPartyType: 'couple' })).toBe(2)
    expect(occupantHeadcount({})).toBe(1)
  })

  it('requires companion name plus email or phone', () => {
    expect(isCoupleCompanionComplete({ name: 'Alex' })).toBe(false)
    expect(
      isCoupleCompanionComplete({ name: 'Alex', email: 'alex@example.com' })
    ).toBe(true)
    expect(
      isCoupleCompanionComplete({ name: 'Alex', phone: '555-123-4567' })
    ).toBe(true)
    expect(normalizeCoupleCompanion({ name: '  Alex ', phone: '555' })).toEqual({
      name: 'Alex',
      phone: '555',
    })
  })
})
