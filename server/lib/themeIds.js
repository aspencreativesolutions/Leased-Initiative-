export const ALL_THEME_IDS = ['graphite', 'ink', 'ocean', 'slate']

export const DEFAULT_PORTAL_THEME_ID = 'slate'

export function isThemeId(value) {
  return typeof value === 'string' && ALL_THEME_IDS.includes(value)
}
