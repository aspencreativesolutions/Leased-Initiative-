import { migrateServiceTier } from './serviceTier.js'
import { PLACEHOLDER_MARKER, blankField } from './residentialLeaseTemplate.js'

export { PLACEHOLDER_MARKER }

/** @deprecated Agency tier copy removed — kept for import compatibility. */
export function buildContractPlaceholderFields(client) {
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

/**
 * Whether the lease still needs landlord customization before it is considered
 * complete. Generation creates a ready template that may still contain blanks.
 */
export function contractNeedsDetail(contract) {
  if (!contract) return false
  if (contract.leaseGenerationStatus === 'generating') return true
  if (contract.isPlaceholderDraft && contract.leaseGenerationStatus !== 'ready') {
    return true
  }

  const keyFields = ['totalCost', 'depositAmount', 'startDate', 'completionDate']

  return keyFields.some((field) => {
    const value = contract[field]?.trim?.() ?? ''
    return !value || value.includes(PLACEHOLDER_MARKER)
  })
}

void migrateServiceTier
