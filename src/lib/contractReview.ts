import type { ContractData } from '@/types'

const CONTRACT_CONTENT_FIELDS: (keyof ContractData)[] = [
  'clientName',
  'businessName',
  'email',
  'phone',
  'clientAddress',
  'serviceTier',
  'projectTitle',
  'projectScope',
  'servicesIncluded',
  'servicesNotIncluded',
  'deliverables',
  'startDate',
  'completionDate',
  'totalCost',
  'depositAmount',
  'remainingBalance',
  'paymentSchedule',
  'paymentProvider',
  'paymentMethods',
  'latePaymentPolicy',
  'revisionCount',
  'extraRevisionFee',
  'revisionLimits',
  'clientResponsibilities',
  'communicationMethod',
  'responseTime',
  'meetingExpectations',
  'ownershipTerms',
  'portfolioRights',
  'terminationTerms',
  'designerSignature',
  'designerSignDate',
  'replacementDocumentFileId',
]

export function contractContentFingerprint(contract: ContractData): string {
  const snap: Record<string, string> = {}
  for (const field of CONTRACT_CONTENT_FIELDS) {
    const value = contract[field]
    snap[field] = typeof value === 'string' ? value : ''
  }
  return JSON.stringify(snap)
}

export function hasContractContentChanged(
  existing: ContractData,
  incoming: ContractData
): boolean {
  return contractContentFingerprint(existing) !== contractContentFingerprint(incoming)
}

export function stripPortalDeliveryFields(contract: ContractData): ContractData {
  return {
    ...contract,
    viewedAt: undefined,
    signedAt: undefined,
    confirmedByClient: false,
    clientSignature: undefined,
    clientSignatureImage: undefined,
    clientSignDate: undefined,
  }
}
