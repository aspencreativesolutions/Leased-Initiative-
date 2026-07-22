export const ALL_THEME_IDS = [
  'ink',
  'soft',
  'ocean',
  'midnight',
  'graphite',
  'citrus',
  'neon',
  'slate',
]

export const DEFAULT_PORTAL_THEME_ID = 'graphite'

export function isThemeId(value) {
  return typeof value === 'string' && ALL_THEME_IDS.includes(value)
}
