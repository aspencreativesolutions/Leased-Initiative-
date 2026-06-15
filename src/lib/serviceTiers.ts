import type { ServiceTier } from '@/types'

export const DEFAULT_SERVICE_TIER: ServiceTier = 'Launch'

export const SERVICE_TIERS: ServiceTier[] = ['Launch', 'Studio', 'Summit']

/** Highest priority first — Summit → Studio → Launch */
export const TIER_PRIORITY: Record<ServiceTier, number> = {
  Summit: 0,
  Studio: 1,
  Launch: 2,
}

export const SERVICE_TIER_IDS: Record<ServiceTier, string> = {
  Launch: 'launch',
  Studio: 'studio',
  Summit: 'summit',
}

export const SERVICE_TIER_TAGLINES: Record<ServiceTier, string> = {
  Launch: 'Your essentials, beautifully presented.',
  Studio: 'Room to grow, designed with intention.',
  Summit: 'The full creative experience — no limits.',
}

const LEGACY_TIER_MAP: Record<string, ServiceTier> = {
  Starter: 'Launch',
  Business: 'Studio',
  'Premium Custom': 'Summit',
  launch: 'Launch',
  studio: 'Studio',
  summit: 'Summit',
  Launch: 'Launch',
  Studio: 'Studio',
  Summit: 'Summit',
}

export function migrateServiceTier(tier: string | undefined | null): ServiceTier {
  if (!tier) return DEFAULT_SERVICE_TIER
  return LEGACY_TIER_MAP[tier] ?? DEFAULT_SERVICE_TIER
}

export function isTopServiceTier(tier: ServiceTier): boolean {
  return tier === 'Summit'
}
