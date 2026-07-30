import { describe, expect, it } from 'vitest'
import {
  buildZelleMemo,
  isValidZelleHandle,
  isZelleConfigured,
  normalizeZelleHandle,
  zellePortalPayPath,
} from '../../server/lib/zelle.js'

describe('zelle helpers', () => {
  it('validates email and US phone handles', () => {
    expect(isValidZelleHandle('rent@example.com')).toBe(true)
    expect(isValidZelleHandle('(555) 123-4567')).toBe(true)
    expect(isValidZelleHandle('15551234567')).toBe(true)
    expect(isValidZelleHandle('not-an-email')).toBe(false)
    expect(isValidZelleHandle('123')).toBe(false)
  })

  it('normalizes phone handles', () => {
    expect(normalizeZelleHandle('5551234567')).toBe('+1 (555) 123-4567')
    expect(normalizeZelleHandle('Rent@Example.COM')).toBe('rent@example.com')
  })

  it('is configured only with a valid handle on settings', () => {
    expect(isZelleConfigured({ zelleHandle: 'rent@example.com' })).toBe(true)
    expect(isZelleConfigured({ zelleHandle: '' })).toBe(false)
    expect(isZelleConfigured({})).toBe(false)
  })

  it('builds memo and portal path', () => {
    expect(buildZelleMemo({ clientId: 'client-abc123', invoiceType: 'rent', dueDate: '2026-08-01' })).toBe(
      'LS-ABC123-RENT-202608'
    )
    expect(zellePortalPayPath('deposit')).toBe('/portal/pay/zelle/deposit')
    expect(zellePortalPayPath('rent')).toBe('/portal/pay/zelle/rent')
  })
})
