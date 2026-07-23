import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONTACT_DISPLAY_MISSING,
  cycleOfficialTenantContactDisplayMode,
  getOfficialTenantContactDisplayValue,
  isOfficialTenantContactDisplayMode,
  loadOfficialTenantContactDisplayMode,
  OFFICIAL_TENANT_CONTACT_DISPLAY_KEY,
  saveOfficialTenantContactDisplayMode,
} from '@/lib/officialTenantContactDisplay'
import type { Client } from '@/types'

function makeClient(partial: Partial<Client> & Pick<Client, 'id' | 'name' | 'email'>): Client {
  return {
    businessName: '',
    phone: '',
    projectType: 'House',
    projectName: '',
    projectStatus: 'In Progress',
    contractStatus: 'Signed',
    paymentStatus: 'Paid',
    isOfficialClient: true,
    notes: [],
    deadlines: [],
    createdAt: '2025-11-01T00:00:00.000Z',
    ...partial,
  }
}

describe('officialTenantContactDisplay', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
      },
    })
  })

  it('recognizes valid modes', () => {
    expect(isOfficialTenantContactDisplayMode('email')).toBe(true)
    expect(isOfficialTenantContactDisplayMode('phone')).toBe(true)
    expect(isOfficialTenantContactDisplayMode('fax')).toBe(false)
  })

  it('cycles email ↔ phone', () => {
    expect(cycleOfficialTenantContactDisplayMode('email')).toBe('phone')
    expect(cycleOfficialTenantContactDisplayMode('phone')).toBe('email')
  })

  it('persists mode in sessionStorage', () => {
    expect(loadOfficialTenantContactDisplayMode()).toBe('email')
    saveOfficialTenantContactDisplayMode('phone')
    expect(memory.get(OFFICIAL_TENANT_CONTACT_DISPLAY_KEY)).toBe('phone')
    expect(loadOfficialTenantContactDisplayMode()).toBe('phone')
  })

  it('returns email or phone for a tenant', () => {
    const client = makeClient({
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      phone: '(555) 111-2222',
    })
    expect(getOfficialTenantContactDisplayValue(client, 'email')).toBe('ada@example.com')
    expect(getOfficialTenantContactDisplayValue(client, 'phone')).toBe('(555) 111-2222')
  })

  it('falls back when phone is missing', () => {
    const client = makeClient({
      id: '2',
      name: 'No Phone',
      email: 'nophone@example.com',
      phone: '  ',
    })
    expect(getOfficialTenantContactDisplayValue(client, 'phone')).toBe(CONTACT_DISPLAY_MISSING)
  })
})
