import {
  DEFAULT_PORTAL_THEME_ID,
  DEFAULT_THEME_ID,
  PORTAL_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  getThemeOption,
} from './options'
import { ALL_THEME_IDS } from './themeIds'
import type { ThemeId } from './types'

export function isThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as string[]).includes(value)
}

export function loadThemeIdFromStorage(storageKey: string): ThemeId {
  const raw = localStorage.getItem(storageKey)
  if (raw && isThemeId(raw)) return raw
  return DEFAULT_THEME_ID
}

export function loadStoredThemeId(): ThemeId {
  return loadThemeIdFromStorage(THEME_STORAGE_KEY)
}

export function loadStoredPortalThemeId(): ThemeId {
  const raw = localStorage.getItem(PORTAL_THEME_STORAGE_KEY)
  if (raw && isThemeId(raw)) return raw
  return DEFAULT_PORTAL_THEME_ID
}

export function applyThemeToDocument(
  themeId: ThemeId,
  storageKey: string = THEME_STORAGE_KEY,
  options?: { persist?: boolean }
): void {
  const theme = getThemeOption(themeId)
  document.documentElement.setAttribute('data-theme', themeId)
  document.documentElement.setAttribute('data-caps-labels', theme.capsLabels ? '1' : '0')
  document.documentElement.setAttribute('data-caps-buttons', theme.capsButtons ? '1' : '0')
  if (options?.persist !== false) {
    localStorage.setItem(storageKey, themeId)
  }
}

/** Studio team sign-in/register — always Ocean Office, without overwriting saved preference */
export function isStudioAuthPath(pathname: string): boolean {
  return pathname === '/studio/login' || pathname === '/studio/register'
}

export function applyStudioAuthTheme(): ThemeId {
  applyThemeToDocument(DEFAULT_THEME_ID, THEME_STORAGE_KEY, { persist: false })
  return DEFAULT_THEME_ID
}

/** Call before React mounts to avoid theme flash (admin app) */
export function initTheme(): ThemeId {
  if (isStudioAuthPath(window.location.pathname)) {
    return applyStudioAuthTheme()
  }
  const id = loadStoredThemeId()
  applyThemeToDocument(id, THEME_STORAGE_KEY)
  return id
}

/** Call before React mounts on portal routes */
export function initPortalTheme(): ThemeId {
  const id = loadStoredPortalThemeId()
  applyThemeToDocument(id, PORTAL_THEME_STORAGE_KEY)
  return id
}

export function isPortalPath(pathname: string): boolean {
  if (pathname.startsWith('/studio')) return false
  if (pathname.startsWith('/portal')) return true
  return pathname === '/login' || pathname === '/register'
}
