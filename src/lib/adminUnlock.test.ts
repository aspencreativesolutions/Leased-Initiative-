import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_UNLOCK_EVENT,
  ADMIN_UNLOCK_PASSWORD,
  ADMIN_UNLOCK_STORAGE_KEY,
  getAdminUnlockHeader,
  isAdminUnlocked,
  lockAdminMode,
  unlockAdminMode,
} from '@/lib/adminUnlock'

function installSessionStorageMock() {
  const store = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
  vi.stubGlobal('sessionStorage', sessionStorage)
  return store
}

describe('adminUnlock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects the wrong password', () => {
    installSessionStorageMock()
    expect(unlockAdminMode('nope')).toBe(false)
    expect(isAdminUnlocked()).toBe(false)
    expect(getAdminUnlockHeader()).toBeNull()
  })

  it('unlocks with the admin password (case-insensitive)', () => {
    installSessionStorageMock()
    const dispatchEvent = vi.fn()
    vi.stubGlobal('window', { dispatchEvent })
    expect(unlockAdminMode('  DivEngineer  ')).toBe(true)
    expect(isAdminUnlocked()).toBe(true)
    expect(getAdminUnlockHeader()).toBe(ADMIN_UNLOCK_PASSWORD)
    expect(dispatchEvent).toHaveBeenCalledWith(expect.any(Event))
    expect(dispatchEvent.mock.calls[0][0].type).toBe(ADMIN_UNLOCK_EVENT)
    expect(sessionStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY)).toBe('1')
  })

  it('can lock again', () => {
    installSessionStorageMock()
    vi.stubGlobal('window', { dispatchEvent: vi.fn() })
    unlockAdminMode(ADMIN_UNLOCK_PASSWORD)
    lockAdminMode()
    expect(isAdminUnlocked()).toBe(false)
    expect(getAdminUnlockHeader()).toBeNull()
  })
})
