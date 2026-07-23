import type { ThemeAppearance, ThemeId, ThemeOption } from './types'

/** Bumped so Slate Bureau becomes the fresh default over earlier Graphite prefs */
export const THEME_STORAGE_KEY = 'leased-app-theme-v5'
export const PORTAL_THEME_STORAGE_KEY = 'leased-portal-theme-v5'
export const APPEARANCE_STORAGE_KEY = 'leased-theme-appearance'
export const DEFAULT_THEME_ID: ThemeId = 'slate'
export const DEFAULT_PORTAL_THEME_ID: ThemeId = 'slate'
export const DEFAULT_APPEARANCE: ThemeAppearance = 'light'

export const themeOptions: ThemeOption[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    tagline: 'Neutral · Formal · Precise',
    description:
      'Rounded lab layout with thin 1px chrome, no glow, and a formal graphite palette. Includes a light/dark switch (light by default).',
    swatches: ['#18181b', '#52525b', '#f4f4f5'],
    supportsAppearance: true,
  },
  {
    id: 'ink',
    name: 'Lab Ink Frame',
    tagline: 'Sharp · Editorial · Clear',
    description:
      'Square frames, 2px ink borders, and geometric chrome. Clean and editorial.',
    swatches: ['#0f172a', '#0f2942', '#f1f5f9'],
  },
  {
    id: 'ocean',
    name: 'Ocean Office',
    tagline: 'Crisp · Professional · Trustworthy',
    description:
      'Deep slate blue, bright sky accents, and soft elevation. Polished and dependable for client-facing work.',
    swatches: ['#0f2942', '#2563eb', '#f1f5f9'],
  },
  {
    id: 'slate',
    name: 'Slate Bureau',
    tagline: 'Cool · Swiss · Precise',
    description:
      'Cool grays, steel blue, and sharp chrome. International corporate clarity without feeling cold.',
    swatches: ['#334155', '#64748b', '#f8fafc'],
  },
]

export function getThemeOption(id: ThemeId): ThemeOption {
  return (
    themeOptions.find((t) => t.id === id) ??
    themeOptions.find((t) => t.id === DEFAULT_THEME_ID) ??
    themeOptions[0]
  )
}

export function themeSupportsAppearance(id: ThemeId): boolean {
  return Boolean(getThemeOption(id).supportsAppearance)
}
