export type ThemeId = 'graphite' | 'ink' | 'ocean' | 'slate'

/** Light/dark surface mode — used by themes that opt in via `supportsAppearance` */
export type ThemeAppearance = 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  name: string
  tagline: string
  description: string
  /** Preview swatches for the picker */
  swatches: [string, string, string]
  /** When true, show a light/dark switch (persisted separately from theme id) */
  supportsAppearance?: boolean
}
