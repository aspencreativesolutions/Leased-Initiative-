import { migrateServiceTier } from '@/lib/serviceTiers'
import type { ServiceTier } from '@/types'

export interface ProjectChecklistItem {
  id: string
  label: string
  /** Shown for Studio / Summit tiers that build on lower tiers */
  tierIntroduced: ServiceTier
}

const LAUNCH_ITEMS: ProjectChecklistItem[] = [
  { id: 'discovery', label: 'Discovery call & message alignment', tierIntroduced: 'Launch' },
  { id: 'single-page-design', label: 'Custom single-page website design', tierIntroduced: 'Launch' },
  { id: 'mobile-responsive', label: 'Mobile-responsive layout', tierIntroduced: 'Launch' },
  { id: 'core-sections', label: 'About, services & contact sections', tierIntroduced: 'Launch' },
  { id: 'contact-form', label: 'Contact form integration', tierIntroduced: 'Launch' },
  { id: 'basic-seo', label: 'Basic SEO setup', tierIntroduced: 'Launch' },
  { id: 'revision-round-1', label: 'One round of revisions', tierIntroduced: 'Launch' },
  { id: 'launch-handoff', label: 'Final launch & handoff', tierIntroduced: 'Launch' },
]

const STUDIO_ITEMS: ProjectChecklistItem[] = [
  { id: 'site-structure', label: 'Site structure mapping (up to 6 pages)', tierIntroduced: 'Studio' },
  { id: 'custom-pages', label: 'Custom page designs (up to 6 pages)', tierIntroduced: 'Studio' },
  { id: 'blog-setup', label: 'Blog setup & publishing workflow', tierIntroduced: 'Studio' },
  { id: 'typography-palette', label: 'Custom typography & color palette', tierIntroduced: 'Studio' },
  { id: 'social-integration', label: 'Social media integration', tierIntroduced: 'Studio' },
  { id: 'revision-round-2', label: 'Second round of revisions', tierIntroduced: 'Studio' },
  { id: 'launch-walkthrough', label: 'Launch-day walkthrough', tierIntroduced: 'Studio' },
]

const SUMMIT_ITEMS: ProjectChecklistItem[] = [
  { id: 'strategy-workshop', label: 'Strategy workshop & creative direction', tierIntroduced: 'Summit' },
  { id: 'custom-dev', label: 'Fully custom design & development', tierIntroduced: 'Summit' },
  { id: 'ecommerce', label: 'E-commerce / online store setup', tierIntroduced: 'Summit' },
  { id: 'integrations', label: 'Advanced integrations (booking, CRM, etc.)', tierIntroduced: 'Summit' },
  { id: 'performance-a11y', label: 'Performance & accessibility optimization', tierIntroduced: 'Summit' },
  { id: 'maintenance', label: 'Ongoing maintenance setup', tierIntroduced: 'Summit' },
  { id: 'priority-support', label: 'Priority support channel', tierIntroduced: 'Summit' },
  { id: 'strategy-checkins', label: 'Quarterly strategy check-in schedule', tierIntroduced: 'Summit' },
]

const TIER_CHECKLIST: Record<ServiceTier, ProjectChecklistItem[]> = {
  Launch: LAUNCH_ITEMS,
  Studio: [...LAUNCH_ITEMS, ...STUDIO_ITEMS],
  Summit: [...LAUNCH_ITEMS, ...STUDIO_ITEMS, ...SUMMIT_ITEMS],
}

export function getProjectChecklistItems(tier: ServiceTier | string | undefined | null): ProjectChecklistItem[] {
  return TIER_CHECKLIST[migrateServiceTier(tier)]
}

export function normalizeCompletedChecklistItems(
  completed: string[] | undefined | null,
  tier: ServiceTier | string | undefined | null
): string[] {
  const validIds = new Set(getProjectChecklistItems(tier).map((item) => item.id))
  return (completed ?? []).filter((id) => validIds.has(id))
}

export function toggleChecklistItem(
  completed: string[] | undefined | null,
  itemId: string,
  checked: boolean,
  tier: ServiceTier | string | undefined | null
): string[] {
  const normalized = normalizeCompletedChecklistItems(completed, tier)
  if (checked) {
    return normalized.includes(itemId) ? normalized : [...normalized, itemId]
  }
  return normalized.filter((id) => id !== itemId)
}
