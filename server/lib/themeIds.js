export const ALL_THEME_IDS = [
  'editorial',
  'soft',
  'mono',
  'golden',
  'ocean',
  'rose',
  'forest',
  'midnight',
  'citrus',
  'vintage',
  'neon',
  'slate',
  'terracotta',
]

export const DEFAULT_PORTAL_THEME_ID = 'ocean'

export function isThemeId(value) {
  return typeof value === 'string' && ALL_THEME_IDS.includes(value)
}
