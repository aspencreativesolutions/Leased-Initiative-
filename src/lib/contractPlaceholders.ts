import { migrateServiceTier } from '@/lib/serviceTiers'
import type { Client } from '@/types'

export const PLACEHOLDER_MARKER = '[To be customized]'

const TIER_SERVICES_INCLUDED = {
  Launch:
    'Custom single-page design, mobile-responsive layout, about/services/contact sections, contact form, basic SEO setup, and one revision round.',
  Studio:
    'Everything in Launch, plus up to 6 custom pages, blog setup, custom typography and color palette, social media integration, and two revision rounds.',
  Summit:
    'Everything in Studio, plus fully custom design and development, e-commerce setup, advanced integrations (booking, CRM, etc.), performance and accessibility optimization, and priority support.',
}

const TIER_SERVICES_NOT_INCLUDED =
  'Copywriting, photography, stock image licensing, third-party plugin subscriptions, ongoing marketing, and work outside the agreed scope unless added via change order.'

const TIER_DELIVERABLES = {
  Launch: 'Final single-page website files, mobile-responsive layout, and launch-ready contact form.',
  Studio: 'Multi-page website files, blog configuration, brand-aligned design system, and launch walkthrough.',
  Summit:
    'Fully custom website or application deliverables, e-commerce configuration, integration setup, and handoff documentation.',
}

export function buildContractPlaceholderFields(client: Pick<Client, 'serviceTier' | 'projectName'>) {
  const tier = migrateServiceTier(client.serviceTier)
  const project = client.projectName || 'this project'

  return {
    servicesIncluded: `${PLACEHOLDER_MARKER} List the services included for ${project}. ${tier} tier typically includes: ${TIER_SERVICES_INCLUDED[tier]}`,
    servicesNotIncluded: `${PLACEHOLDER_MARKER} List services not included for ${project}. Common exclusions: ${TIER_SERVICES_NOT_INCLUDED}`,
    deliverables: `${PLACEHOLDER_MARKER} Specify deliverables for ${project}. ${tier} tier example: ${TIER_DELIVERABLES[tier]}`,
    totalCost: `${PLACEHOLDER_MARKER} Enter total project cost`,
    depositAmount: `${PLACEHOLDER_MARKER} Enter deposit amount`,
    remainingBalance: `${PLACEHOLDER_MARKER} Enter remaining balance`,
    startDate: `${PLACEHOLDER_MARKER} Enter project start date`,
    completionDate: `${PLACEHOLDER_MARKER} Enter estimated completion date`,
    extraRevisionFee: `${PLACEHOLDER_MARKER} Enter fee for additional revisions, if applicable`,
  }
}

export function contractNeedsDetail(contract: {
  isPlaceholderDraft?: boolean
  servicesIncluded?: string
  servicesNotIncluded?: string
  deliverables?: string
  totalCost?: string
  depositAmount?: string
}) {
  if (contract.isPlaceholderDraft) return true

  const keyFields = [
    contract.servicesIncluded,
    contract.servicesNotIncluded,
    contract.deliverables,
    contract.totalCost,
    contract.depositAmount,
  ]

  return keyFields.some((value) => {
    const trimmed = value?.trim() ?? ''
    return !trimmed || trimmed.includes(PLACEHOLDER_MARKER)
  })
}
