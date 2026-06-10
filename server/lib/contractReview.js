/** Contract terms — changes require client re-review and signature */
export const CONTRACT_CONTENT_FIELDS = [
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
]

export function contractContentFingerprint(contract) {
  const snap = {}
  for (const field of CONTRACT_CONTENT_FIELDS) {
    snap[field] = contract?.[field] ?? ''
  }
  return JSON.stringify(snap)
}

export function hasContractContentChanged(existing, incoming) {
  if (!existing || !incoming) return false
  return contractContentFingerprint(existing) !== contractContentFingerprint(incoming)
}

/** Signature from an older send or content revision */
export function isSignatureStale(contract) {
  if (!contract?.confirmedByClient || !contract?.signedAt) return false

  if (contract.sentAt && new Date(contract.signedAt).getTime() < new Date(contract.sentAt).getTime()) {
    return true
  }

  if (
    contract.contentUpdatedAt &&
    new Date(contract.signedAt).getTime() < new Date(contract.contentUpdatedAt).getTime()
  ) {
    return true
  }

  if (
    contract.signedContentFingerprint &&
    contract.signedContentFingerprint !== contractContentFingerprint(contract)
  ) {
    return true
  }

  return false
}

/** Client record still awaiting signature while contract shows signed (partial revision) */
export function hasContractClientStatusMismatch(contract, client) {
  if (!contract?.confirmedByClient || !client) return false
  return client.contractStatus === 'Sent' || client.projectStatus === 'Contract Sent'
}

export function needsClientResign(contract, client) {
  if (!contract?.sentAt || !contract?.confirmedByClient) return false
  return isSignatureStale(contract) || hasContractClientStatusMismatch(contract, client)
}

export function hasReviewedCurrentVersion(contract) {
  if (!contract?.viewedAt || !contract?.sentAt) return false
  return new Date(contract.viewedAt).getTime() >= new Date(contract.sentAt).getTime()
}

export function clearContractClientSignature(contract) {
  return {
    ...contract,
    signedAt: undefined,
    confirmedByClient: false,
    clientSignature: undefined,
    clientSignDate: undefined,
    signedContentFingerprint: undefined,
    viewedAt: undefined,
  }
}

export function prepareContractForClientReview(contract, now = new Date().toISOString()) {
  const cleared = clearContractClientSignature(contract)
  return {
    ...cleared,
    sentAt: now,
    contentUpdatedAt: now,
  }
}

export function getPortalContractStatus(contract) {
  if (contract.confirmedByClient && !isSignatureStale(contract)) {
    return 'Accepted'
  }

  if (hasReviewedCurrentVersion(contract)) {
    return 'Viewed'
  }

  return 'Pending Review'
}

export function clientCanSignContract(contract) {
  if (!contract?.sentAt) return false
  if (contract.confirmedByClient && !isSignatureStale(contract)) return false
  return hasReviewedCurrentVersion(contract)
}
