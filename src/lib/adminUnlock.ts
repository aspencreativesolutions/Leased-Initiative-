/** Home-logo unlock for Admin Mode (demo code, mock users, etc.). */

export const ADMIN_UNLOCK_PASSWORD = 'divengineer'
export const ADMIN_UNLOCK_STORAGE_KEY = 'leased-admin-unlocked'
export const ADMIN_UNLOCK_EVENT = 'leased-admin-unlock'

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Returns true when the password matches and admin mode is unlocked. */
export function unlockAdminMode(password: string): boolean {
  const normalized = password.trim().toLowerCase()
  if (normalized !== ADMIN_UNLOCK_PASSWORD) return false
  try {
    sessionStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_UNLOCK_EVENT))
  }
  return true
}

export function lockAdminMode(): void {
  try {
    sessionStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_UNLOCK_EVENT))
  }
}

/** Sent on /api/dev requests after unlock so production API can authorize Admin Mode. */
export function getAdminUnlockHeader(): string | null {
  return isAdminUnlocked() ? ADMIN_UNLOCK_PASSWORD : null
}
