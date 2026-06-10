/** Stable anchor IDs for contract sections — used in portal profile links */
export const CONTRACT_SECTION_IDS = {
  summary: 'contract-summary',
  projectScope: 'project-scope',
  servicesIncluded: 'services-included',
  servicesNotIncluded: 'services-not-included',
  deliverables: 'deliverables',
  paymentSchedule: 'payment-schedule',
  paymentMethods: 'payment-methods',
  latePayment: 'late-payment-policy',
  revisions: 'revisions',
  clientResponsibilities: 'client-responsibilities',
  communication: 'communication',
  ownership: 'ownership',
  portfolioRights: 'portfolio-rights',
  termination: 'termination',
} as const

export type ContractSectionId =
  (typeof CONTRACT_SECTION_IDS)[keyof typeof CONTRACT_SECTION_IDS]

export function contractSectionHref(contractId: string, sectionId: ContractSectionId) {
  return `/portal/contracts/${contractId}#${sectionId}`
}
