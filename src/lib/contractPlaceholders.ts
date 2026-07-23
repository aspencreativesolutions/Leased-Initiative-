import { PLACEHOLDER_MARKER, blankField } from '@/lib/residentialLeaseTemplate'
import type { Client } from '@/types'

export { PLACEHOLDER_MARKER }

/** Blank residential fields for new drafts — never invent amounts. */
export function buildContractPlaceholderFields(
  client: Pick<Client, 'projectName' | 'serviceTier'>
) {
  const project = client.projectName || 'this rental'
  return {
    servicesIncluded: blankField(`List utilities included for ${project}`),
    servicesNotIncluded: blankField(`List utilities the tenant pays for ${project}`),
    deliverables: blankField('Describe occupancy limits and permitted use'),
    totalCost: blankField('Enter monthly rent amount'),
    depositAmount: blankField('Enter security deposit amount'),
    remainingBalance: blankField('Enter first payment / move-in total if applicable'),
    startDate: blankField('Enter lease start date'),
    completionDate: blankField('Enter lease end date'),
    extraRevisionFee: blankField('Pet deposit or fee (if applicable)'),
  }
}

export function contractNeedsDetail(contract: {
  isPlaceholderDraft?: boolean
  leaseGenerationStatus?: 'generating' | 'ready'
  servicesIncluded?: string
  servicesNotIncluded?: string
  deliverables?: string
  totalCost?: string
  depositAmount?: string
  startDate?: string
  completionDate?: string
}) {
  if (!contract) return false
  if (contract.leaseGenerationStatus === 'generating') return true
  if (contract.isPlaceholderDraft && contract.leaseGenerationStatus !== 'ready') {
    return true
  }

  const keyFields = [
    contract.totalCost,
    contract.depositAmount,
    contract.startDate,
    contract.completionDate,
  ]

  return keyFields.some((value) => {
    const trimmed = value?.trim() ?? ''
    return !trimmed || trimmed.includes(PLACEHOLDER_MARKER)
  })
}
