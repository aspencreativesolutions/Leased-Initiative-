/** Home-logo unlock for Admin Mode (demo code, mock users, etc.). */

import { safeSessionGet, safeSessionRemove, safeSessionSet } from '@/lib/safeStorage'

export const ADMIN_UNLOCK_PASSWORD = 'divengineer'
export const ADMIN_UNLOCK_STORAGE_KEY = 'leased-admin-unlocked'
export const ADMIN_UNLOCK_EVENT = 'leased-admin-unlock'

export function isAdminUnlocked(): boolean {
  return safeSessionGet(ADMIN_UNLOCK_STORAGE_KEY) === '1'
}

/** Returns true when the password matches and admin mode is unlocked. */
export function unlockAdminMode(password: string): boolean {
  const normalized = password.trim().toLowerCase()
  if (normalized !== ADMIN_UNLOCK_PASSWORD) return false
  safeSessionSet(ADMIN_UNLOCK_STORAGE_KEY, '1')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_UNLOCK_EVENT))
  }
  return true
}

export function lockAdminMode(): void {
  safeSessionRemove(ADMIN_UNLOCK_STORAGE_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_UNLOCK_EVENT))
  }
}

/** Sent on /api/dev requests after unlock so production API can authorize Admin Mode. */
export function getAdminUnlockHeader(): string | null {
  return isAdminUnlocked() ? ADMIN_UNLOCK_PASSWORD : null
}
