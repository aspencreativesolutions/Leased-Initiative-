import type { ThemeId, ThemeOption } from './types'

export const THEME_STORAGE_KEY = 'client-craft-theme'
export const PORTAL_THEME_STORAGE_KEY = 'client-craft-portal-theme'
export const DEFAULT_THEME_ID: ThemeId = 'ocean'
export const DEFAULT_PORTAL_THEME_ID: ThemeId = 'ocean'

export const themeOptions: ThemeOption[] = [
  {
    id: 'editorial',
    name: 'Editorial Noir',
    tagline: 'Bold · Classic · Chic',
    description:
      'Black bar navigation, serif headlines, burgundy accents, and crisp borders. Feels like a design studio magazine.',
    swatches: ['#111111', '#6d2e3a', '#ebe6de'],
    capsLabels: true,
    capsButtons: true,
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
    id: 'mono',
    name: 'Mono Gallery',
    tagline: 'Stark · Minimal · Art-forward',
    description:
      'Pure black and white, square edges, geometric type. Gallery-white walls and confident contrast.',
    swatches: ['#000000', '#ffffff', '#f0f0f0'],
    capsLabels: true,
    capsButtons: true,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    tagline: 'Warm · Luxe · Inviting',
    description:
      'Espresso browns, champagne gold, and cream paper. Boutique hospitality meets creative agency.',
    swatches: ['#2c2419', '#b8956b', '#f5f0e8'],
    capsLabels: true,
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
    id: 'rose',
    name: 'Rose Salon',
    tagline: 'Soft · Feminine · Refined',
    description:
      'Blush and dusty rose on cream, delicate serifs, and a light nav. Beauty, wellness, and lifestyle brands.',
    swatches: ['#5c3d47', '#c9a9a6', '#faf5f4'],
    capsLabels: false,
    capsButtons: false,
  },
  {
    id: 'forest',
    name: 'Forest Studio',
    tagline: 'Natural · Grounded · Organic',
    description:
      'Deep pine and sage greens on warm off-white. Earthy, calm, and perfect for sustainable or outdoor clients.',
    swatches: ['#1a3c34', '#5a7d6a', '#f4f6f2'],
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
    id: 'vintage',
    name: 'Vintage Desk',
    tagline: 'Retro · Warm · Nostalgic',
    description:
      'Terracotta, sepia ink, and textured cream paper. Typewriter-era charm for writers and heritage brands.',
    swatches: ['#3d2e26', '#c45c3e', '#f2e8dc'],
    capsLabels: true,
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
  {
    id: 'terracotta',
    name: 'Mediterranean',
    tagline: 'Sun-baked · Artisan · Earthy',
    description:
      'Clay red, olive green, and sun-bleached linen. Handmade ceramics and coastal studio energy.',
    swatches: ['#4a3728', '#b55233', '#f0e6d8'],
    capsLabels: false,
    capsButtons: false,
  },
]

export function getThemeOption(id: ThemeId): ThemeOption {
  return themeOptions.find((t) => t.id === id) ?? themeOptions[0]
}
