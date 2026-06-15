export type ThemeId =
  | 'editorial'
  | 'soft'
  | 'mono'
  | 'ocean'
  | 'rose'
  | 'forest'
  | 'midnight'
  | 'citrus'
  | 'vintage'
  | 'neon'
  | 'slate'
  | 'terracotta'

export interface ThemeOption {
  id: ThemeId
  name: string
  tagline: string
  description: string
  /** Preview swatches for the picker */
  swatches: [string, string, string]
  capsLabels: boolean
  capsButtons: boolean
}
