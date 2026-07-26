/**
 * Storage helpers that never throw — Safari Advanced Tracking / private mode
 * can block localStorage/sessionStorage and surface a privacy banner if scripts crash.
 */

type StorageKind = 'local' | 'session'

function getStore(kind: StorageKind): Storage | null {
  try {
    const storage = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage
    return storage ?? null
  } catch {
    return null
  }
}

export function safeGetItem(kind: StorageKind, key: string): string | null {
  try {
    return getStore(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function safeSetItem(kind: StorageKind, key: string, value: string): boolean {
  try {
    const store = getStore(kind)
    if (!store) return false
    store.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(kind: StorageKind, key: string): boolean {
  try {
    const store = getStore(kind)
    if (!store) return false
    store.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function safeLocalGet(key: string): string | null {
  return safeGetItem('local', key)
}

export function safeLocalSet(key: string, value: string): boolean {
  return safeSetItem('local', key, value)
}

export function safeLocalRemove(key: string): boolean {
  return safeRemoveItem('local', key)
}

export function safeSessionGet(key: string): string | null {
  return safeGetItem('session', key)
}

export function safeSessionSet(key: string, value: string): boolean {
  return safeSetItem('session', key, value)
}

export function safeSessionRemove(key: string): boolean {
  return safeRemoveItem('session', key)
}
