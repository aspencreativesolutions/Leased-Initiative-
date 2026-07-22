import type { ThemeAppearance, ThemeId, ThemeOption } from './types'

/** Bumped so Graphite Lab becomes the fresh default over legacy Ink Frame prefs */
export const THEME_STORAGE_KEY = 'leased-app-theme-v2'
export const PORTAL_THEME_STORAGE_KEY = 'leased-portal-theme-v2'
export const APPEARANCE_STORAGE_KEY = 'leased-theme-appearance'
export const DEFAULT_THEME_ID: ThemeId = 'graphite'
export const DEFAULT_PORTAL_THEME_ID: ThemeId = 'graphite'
export const DEFAULT_APPEARANCE: ThemeAppearance = 'light'

export const themeOptions: ThemeOption[] = [
  {
    id: 'graphite',
    name: 'Graphite Lab',
    tagline: 'Neutral · Formal · Precise',
    description:
      'Midnight Lab’s rounded lab layout with thin 1px chrome, no glow, and a formal graphite palette. Includes a light/dark switch (light by default).',
    swatches: ['#18181b', '#52525b', '#f4f4f5'],
    capsLabels: false,
    capsButtons: false,
    supportsAppearance: true,
  },
  {
    id: 'ink',
    name: 'Ink Frame',
    tagline: 'Sharp · Editorial · Clear',
    description:
      'The classic Leased welcome look — square frames, 2px ink borders, Outfit display type. Clean and geometric.',
    swatches: ['#0f172a', '#0f2942', '#f1f5f9'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'soft',
    name: 'Soft Atelier',
    tagline: 'Calm · Friendly · Modern',
    description:
      'Light airy layout, rounded cards, navy and teal tones. Easygoing SaaS energy without feeling corporate.',
    swatches: ['#2c4a6e', '#4a9b8e', '#fafaf9'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'ocean',
    name: 'Ocean Office',
    tagline: 'Crisp · Professional · Trustworthy',
    description:
      'Deep slate blue, bright sky accents, clean sans-serif. Polished and dependable for client-facing work.',
    swatches: ['#0f2942', '#2563eb', '#f1f5f9'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'midnight',
    name: 'Midnight Lab',
    tagline: 'Dark · Sleek · Tech-forward',
    description:
      'Near-black surfaces with violet and periwinkle accents. Feels like a premium dev tool or creative tech studio.',
    swatches: ['#0f0f14', '#8b7cf6', '#1a1a22'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'citrus',
    name: 'Citrus Pop',
    tagline: 'Bright · Playful · Energetic',
    description:
      'Punchy orange, sunny yellow, and bold rounded shapes. Great for upbeat brands that want personality.',
    swatches: ['#1a1a1a', '#e85d04', '#fffbeb'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'neon',
    name: 'Neon District',
    tagline: 'Electric · Bold · Night-city',
    description:
      'Dark canvas with hot pink and cyan glow accents. Unapologetically loud for music, events, and streetwear.',
    swatches: ['#0a0a0f', '#ff2d6a', '#00e5cc'],
    capsLabels: true,
    capsButtons: true,
  },
  {
    id: 'slate',
    name: 'Slate Bureau',
    tagline: 'Cool · Swiss · Precise',
    description:
      'Cool grays, steel blue, and tight spacing. International corporate clarity without feeling cold.',
    swatches: ['#334155', '#64748b', '#f8fafc'],
    capsLabels: true,
    capsButtons: true,
  },
]

export function getThemeOption(id: ThemeId): ThemeOption {
  return themeOptions.find((t) => t.id === id) ?? themeOptions[0]
}

export function themeSupportsAppearance(id: ThemeId): boolean {
  return Boolean(getThemeOption(id).supportsAppearance)
}
