import { CONTRACT_SECTION_IDS } from '@/lib/contractSections'
import type { ContractSectionId } from '@/lib/contractSections'
import type { ServiceTier } from '@/types'

export interface TierDetailLink {
  label: string
  sectionId: ContractSectionId
}

export interface ServiceTierInfo {
  summary: string
  details: TierDetailLink[]
}

const TIER_INFO: Record<ServiceTier, ServiceTierInfo> = {
  Starter: {
    summary:
      'Core project support with standard scheduling priority, defined revision rounds, and email-based communication.',
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
  Business: {
    summary:
      'Elevated scheduling priority with expanded revision allowance, faster response times, and dedicated project attention.',
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
  'Premium Custom': {
    summary:
      'Highest scheduling priority with custom revision terms, direct designer access, and tailored scope for complex projects.',
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

export function getServiceTierInfo(tier: ServiceTier): ServiceTierInfo {
  return TIER_INFO[tier] ?? TIER_INFO.Starter
}
