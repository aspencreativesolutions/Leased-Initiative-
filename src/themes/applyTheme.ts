import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, getThemeOption } from './options'
import { ALL_THEME_IDS } from './themeIds'
import type { ThemeId } from './types'

export function isThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as string[]).includes(value)
}

export function loadStoredThemeId(): ThemeId {
  const raw = localStorage.getItem(THEME_STORAGE_KEY)
  if (raw && isThemeId(raw)) return raw
  return DEFAULT_THEME_ID
}

export function applyThemeToDocument(themeId: ThemeId): void {
  const theme = getThemeOption(themeId)
  document.documentElement.setAttribute('data-theme', themeId)
  document.documentElement.setAttribute('data-caps-labels', theme.capsLabels ? '1' : '0')
  document.documentElement.setAttribute('data-caps-buttons', theme.capsButtons ? '1' : '0')
  localStorage.setItem(THEME_STORAGE_KEY, themeId)
}

/** Call before React mounts to avoid theme flash */
export function initTheme(): ThemeId {
  const id = loadStoredThemeId()
  applyThemeToDocument(id)
  return id
}
