export type ThemeId =
  | 'ink'
  | 'soft'
  | 'ocean'
  | 'midnight'
  | 'graphite'
  | 'citrus'
  | 'neon'
  | 'slate'

/** Light/dark surface mode — used by themes that opt in via `supportsAppearance` */
export type ThemeAppearance = 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  name: string
  tagline: string
  description: string
  /** Preview swatches for the picker */
  swatches: [string, string, string]
  capsLabels: boolean
  capsButtons: boolean
  /** When true, show a light/dark switch (persisted separately from theme id) */
  supportsAppearance?: boolean
}
