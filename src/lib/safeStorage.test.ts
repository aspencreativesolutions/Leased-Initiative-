import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  safeLocalGet,
  safeLocalRemove,
  safeLocalSet,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from '@/lib/safeStorage'

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

function installMapStorage() {
  const make = () => {
    const store = new Map<string, string>()
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    }
  }
  vi.stubGlobal('localStorage', make())
  vi.stubGlobal('sessionStorage', make())
}

describe('safeStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads and writes without throwing when storage works', () => {
    installMapStorage()
    expect(safeLocalSet('a', '1')).toBe(true)
    expect(safeLocalGet('a')).toBe('1')
    expect(safeLocalRemove('a')).toBe(true)
    expect(safeLocalGet('a')).toBeNull()

    expect(safeSessionSet('b', '2')).toBe(true)
    expect(safeSessionGet('b')).toBe('2')
    expect(safeSessionRemove('b')).toBe(true)
    expect(safeSessionGet('b')).toBeNull()
  })

  it('returns null/false when storage throws (privacy block)', () => {
    installThrowingStorage()
    expect(safeLocalGet('x')).toBeNull()
    expect(safeLocalSet('x', '1')).toBe(false)
    expect(safeLocalRemove('x')).toBe(false)
    expect(safeSessionGet('x')).toBeNull()
    expect(safeSessionSet('x', '1')).toBe(false)
    expect(safeSessionRemove('x')).toBe(false)
  })
})
