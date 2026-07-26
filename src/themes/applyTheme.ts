import { safeLocalGet, safeLocalRemove, safeLocalSet } from '@/lib/safeStorage'
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_PORTAL_THEME_ID,
  DEFAULT_THEME_ID,
  PORTAL_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
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
  const raw = safeLocalGet(storageKey)
  if (raw && isThemeId(raw)) return raw
  return DEFAULT_THEME_ID
}

export function loadStoredThemeId(): ThemeId {
  return loadThemeIdFromStorage(THEME_STORAGE_KEY)
}

export function loadStoredPortalThemeId(): ThemeId {
  const raw = safeLocalGet(PORTAL_THEME_STORAGE_KEY)
  if (raw && isThemeId(raw)) return raw
  return DEFAULT_PORTAL_THEME_ID
}

export function loadStoredAppearance(): ThemeAppearance {
  const raw = safeLocalGet(APPEARANCE_STORAGE_KEY)
  if (raw && isThemeAppearance(raw)) return raw
  return DEFAULT_APPEARANCE
}

export function applyAppearanceToDocument(
  appearance: ThemeAppearance,
  options?: { persist?: boolean }
): void {
  document.documentElement.setAttribute('data-appearance', appearance)
  if (options?.persist === true) {
    safeLocalSet(APPEARANCE_STORAGE_KEY, appearance)
  }
}

export const THEME_PREFERENCE_EVENT = 'leased-theme-preference'

/**
 * Persist a theme id to both studio and portal storage keys.
 * Used for home-page previews and Demo Mode so landlord ↔ tenant POV switches keep the same look.
 */
export function persistThemeIdAcrossSurfaces(themeId: ThemeId): void {
  safeLocalSet(THEME_STORAGE_KEY, themeId)
  safeLocalSet(PORTAL_THEME_STORAGE_KEY, themeId)
  window.dispatchEvent(
    new CustomEvent(THEME_PREFERENCE_EVENT, { detail: { themeId } })
  )
}

export function applyThemeToDocument(
  themeId: ThemeId,
  storageKey: string = THEME_STORAGE_KEY,
  options?: { persist?: boolean; appearance?: ThemeAppearance; syncSurfaces?: boolean }
): void {
  // Typography (fonts, caps, tracking) is shared — Slate Bureau baseline for every theme
  document.documentElement.setAttribute('data-theme', themeId)
  document.documentElement.setAttribute('data-caps-labels', '1')
  document.documentElement.setAttribute('data-caps-buttons', '1')

  const appearance =
    options?.appearance ??
    (themeSupportsAppearance(themeId) ? loadStoredAppearance() : DEFAULT_APPEARANCE)
  applyAppearanceToDocument(appearance, { persist: false })

  if (options?.persist === true) {
    if (options.syncSurfaces) {
      persistThemeIdAcrossSurfaces(themeId)
    } else {
      safeLocalSet(storageKey, themeId)
    }
  }
}

/** Clear saved style prefs so the next load uses the default theme until the user picks again */
export function clearThemePreferences(): void {
  safeLocalRemove(THEME_STORAGE_KEY)
  safeLocalRemove(PORTAL_THEME_STORAGE_KEY)
  safeLocalRemove(APPEARANCE_STORAGE_KEY)
  // Drop legacy keys so removed styles / old defaults cannot resurface
  safeLocalRemove('leased-app-theme-v4')
  safeLocalRemove('leased-portal-theme-v4')
  safeLocalRemove('leased-app-theme-v3')
  safeLocalRemove('leased-portal-theme-v3')
  safeLocalRemove('leased-app-theme-v2')
  safeLocalRemove('leased-portal-theme-v2')
}

/** Public introduction / marketing routes (participate in the shared theme system) */
export function isIntroPath(pathname: string): boolean {
  return pathname === '/' || pathname === ''
}

/** Studio team sign-in/register paths */
export function isStudioAuthPath(pathname: string): boolean {
  return pathname === '/studio/login' || pathname === '/studio/register'
}

export function applyDefaultThemeToDocument(): ThemeId {
  applyThemeToDocument(DEFAULT_THEME_ID, THEME_STORAGE_KEY, {
    persist: false,
    appearance: DEFAULT_APPEARANCE,
  })
  return DEFAULT_THEME_ID
}

/** @deprecated Prefer applyDefaultThemeToDocument — same behavior with Slate Bureau default */
export function applyStudioAuthTheme(): ThemeId {
  return applyDefaultThemeToDocument()
}

/** Call before React mounts to avoid theme flash (admin app + introduction) */
export function initTheme(): ThemeId {
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
