import { CONTRACT_SECTION_IDS } from '@/lib/contractSections'
import { migrateServiceTier } from '@/lib/serviceTiers'
import type { ContractSectionId } from '@/lib/contractSections'
import type { ServiceTier } from '@/types'

export interface TierDetailLink {
  label: string
  sectionId: ContractSectionId
}

export interface ServiceTierInfo {
  tagline: string
  summary: string
  details: TierDetailLink[]
}

const TIER_INFO: Record<ServiceTier, ServiceTierInfo> = {
  Launch: {
    tagline: 'Your essentials, beautifully presented.',
    summary:
      'Polished single-page site for a strong online presence fast. Discovery call + co-created layout. Includes: custom single-page design, mobile-responsive layout, about/services/contact sections, contact form, basic SEO, one revision round. Ideal for new businesses, freelancers, and creators ready to go live.',
    details: [
      {
        label: 'Service tier and project terms',
        sectionId: CONTRACT_SECTION_IDS.summary,
      },
      {
        label: 'Included revision rounds and limits',
        sectionId: CONTRACT_SECTION_IDS.revisions,
      },
      {
        label: 'Communication and response expectations',
        sectionId: CONTRACT_SECTION_IDS.communication,
      },
      {
        label: 'Scope, deliverables, and timeline',
        sectionId: CONTRACT_SECTION_IDS.projectScope,
      },
    ],
  },
  Studio: {
    tagline: 'Room to grow, designed with intention.',
    summary:
      'Multi-page site with custom design and blog. Collaborative site mapping and design refinement. Includes everything in Launch, plus: up to 6 custom pages, blog setup, custom typography & color palette, social media integration, two revision rounds, launch-day walkthrough. Ideal for growing brands, consultants, and small teams building authority.',
    details: [
      {
        label: 'Service tier and project terms',
        sectionId: CONTRACT_SECTION_IDS.summary,
      },
      {
        label: 'Revision allowance and timeline',
        sectionId: CONTRACT_SECTION_IDS.revisions,
      },
      {
        label: 'Communication channels and response time',
        sectionId: CONTRACT_SECTION_IDS.communication,
      },
      {
        label: 'Scope, deliverables, and included services',
        sectionId: CONTRACT_SECTION_IDS.servicesIncluded,
      },
    ],
  },
  Summit: {
    tagline: 'The full creative experience — no limits.',
    summary:
      'Fully customized site with e-commerce, maintenance, and advanced features. Most hands-on partnership: strategy workshops, design sprints, long-term evolution. Includes everything in Studio, plus: fully custom design & development, e-commerce setup, advanced integrations (booking, CRM, etc.), performance & accessibility optimization, ongoing maintenance & updates, priority support, quarterly strategy check-ins. Ideal for established businesses and ambitious brands ready to scale.',
    details: [
      {
        label: 'Service tier and project terms',
        sectionId: CONTRACT_SECTION_IDS.summary,
      },
      {
        label: 'Custom revision terms',
        sectionId: CONTRACT_SECTION_IDS.revisions,
      },
      {
        label: 'Dedicated communication expectations',
        sectionId: CONTRACT_SECTION_IDS.communication,
      },
      {
        label: 'Full scope, deliverables, and payment schedule',
        sectionId: CONTRACT_SECTION_IDS.deliverables,
      },
    ],
  },
}

export function getServiceTierInfo(tier: ServiceTier | string): ServiceTierInfo {
  return TIER_INFO[migrateServiceTier(tier)]
}
