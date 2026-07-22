import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_PORTAL_THEME_ID,
  DEFAULT_THEME_ID,
  PORTAL_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  getThemeOption,
  themeSupportsAppearance,
} from './options'
import { ALL_THEME_IDS } from './themeIds'
import type { ThemeAppearance, ThemeId } from './types'

export function isThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as string[]).includes(value)
}

export function isThemeAppearance(value: string): value is ThemeAppearance {
  return value === 'light' || value === 'dark'
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

export function loadStoredAppearance(): ThemeAppearance {
  const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY)
  if (raw && isThemeAppearance(raw)) return raw
  return DEFAULT_APPEARANCE
}

export function applyAppearanceToDocument(
  appearance: ThemeAppearance,
  options?: { persist?: boolean }
): void {
  document.documentElement.setAttribute('data-appearance', appearance)
  if (options?.persist === true) {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance)
  }
}

export function applyThemeToDocument(
  themeId: ThemeId,
  storageKey: string = THEME_STORAGE_KEY,
  options?: { persist?: boolean; appearance?: ThemeAppearance }
): void {
  const theme = getThemeOption(themeId)
  document.documentElement.setAttribute('data-theme', themeId)
  document.documentElement.setAttribute('data-caps-labels', theme.capsLabels ? '1' : '0')
  document.documentElement.setAttribute('data-caps-buttons', theme.capsButtons ? '1' : '0')

  const appearance =
    options?.appearance ??
    (themeSupportsAppearance(themeId) ? loadStoredAppearance() : DEFAULT_APPEARANCE)
  applyAppearanceToDocument(appearance, { persist: false })

  if (options?.persist === true) {
    localStorage.setItem(storageKey, themeId)
  }
}

/** Clear saved style prefs so the next load uses the default theme until the user picks again */
export function clearThemePreferences(): void {
  localStorage.removeItem(THEME_STORAGE_KEY)
  localStorage.removeItem(PORTAL_THEME_STORAGE_KEY)
  localStorage.removeItem(APPEARANCE_STORAGE_KEY)
}

/** Studio team sign-in/register — always default theme, without overwriting saved preference */
export function isStudioAuthPath(pathname: string): boolean {
  return pathname === '/studio/login' || pathname === '/studio/register'
}

export function applyStudioAuthTheme(): ThemeId {
  applyThemeToDocument(DEFAULT_THEME_ID, THEME_STORAGE_KEY, {
    persist: false,
    appearance: DEFAULT_APPEARANCE,
  })
  return DEFAULT_THEME_ID
}

/** Call before React mounts to avoid theme flash (admin app) */
export function initTheme(): ThemeId {
  if (isStudioAuthPath(window.location.pathname)) {
    return applyStudioAuthTheme()
  }
  const id = loadStoredThemeId()
  applyThemeToDocument(id, THEME_STORAGE_KEY, { persist: false })
  return id
}

/** Call before React mounts on portal routes */
export function initPortalTheme(): ThemeId {
  const id = loadStoredPortalThemeId()
  applyThemeToDocument(id, PORTAL_THEME_STORAGE_KEY, { persist: false })
  return id
}

export function isPortalPath(pathname: string): boolean {
  if (pathname.startsWith('/studio')) return false
  if (pathname.startsWith('/portal')) return true
  return pathname === '/login' || pathname === '/register'
}
