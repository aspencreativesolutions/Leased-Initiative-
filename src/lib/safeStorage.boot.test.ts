import { afterEach, describe, expect, it, vi } from 'vitest'
import { getToken, setToken } from '@/lib/api'
import { isAdminUnlocked, unlockAdminMode } from '@/lib/adminUnlock'
import {
  applyDefaultThemeToDocument,
  clearThemePreferences,
  initPortalTheme,
  initTheme,
  loadStoredAppearance,
  loadStoredThemeId,
} from '@/themes/applyTheme'
import { DEFAULT_APPEARANCE, DEFAULT_THEME_ID } from '@/themes/options'

function installThrowingStorage() {
  const throwing = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
    clear: () => {},
    key: () => null,
    length: 0,
  }
  vi.stubGlobal('localStorage', throwing)
  vi.stubGlobal('sessionStorage', throwing)
}

function installDocumentStub() {
  const attrs = new Map<string, string>()
  vi.stubGlobal('document', {
    documentElement: {
      setAttribute: (key: string, value: string) => {
        attrs.set(key, value)
      },
      getAttribute: (key: string) => attrs.get(key) ?? null,
      removeAttribute: (key: string) => {
        attrs.delete(key)
      },
    },
  })
  return attrs
}

describe('boot paths with blocked storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('theme init falls back to defaults without throwing', () => {
    installThrowingStorage()
    const attrs = installDocumentStub()
    expect(loadStoredThemeId()).toBe(DEFAULT_THEME_ID)
    expect(loadStoredAppearance()).toBe(DEFAULT_APPEARANCE)
    expect(() => initTheme()).not.toThrow()
    expect(initTheme()).toBe(DEFAULT_THEME_ID)
    expect(() => initPortalTheme()).not.toThrow()
    expect(() => applyDefaultThemeToDocument()).not.toThrow()
    expect(() => clearThemePreferences()).not.toThrow()
    expect(attrs.get('data-theme')).toBe(DEFAULT_THEME_ID)
  })

  it('auth token helpers never throw', () => {
    installThrowingStorage()
    expect(getToken()).toBeNull()
    expect(() => setToken('abc')).not.toThrow()
    expect(() => setToken(null)).not.toThrow()
    expect(getToken()).toBeNull()
  })

  it('admin unlock helpers never throw', () => {
    installThrowingStorage()
    vi.stubGlobal('window', { dispatchEvent: vi.fn() })
    expect(isAdminUnlocked()).toBe(false)
    expect(unlockAdminMode('divengineer')).toBe(true)
    // Unlock succeeds, but session write is blocked so state stays locked.
    expect(isAdminUnlocked()).toBe(false)
  })
})
