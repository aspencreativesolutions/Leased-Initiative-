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

export function isClientContractSigned(client, contract) {
  const signedOnRecord =
    contract?.signedAt &&
    contract?.confirmedByClient &&
    !isSignatureStale(contract)
  const timelineSigned = Boolean(client?.timelineStepSkips?.contract_signed)
  return (
    signedOnRecord ||
    timelineSigned ||
    client?.contractStatus === 'Signed' ||
    client?.contractStatus === 'Completed'
  )
}

export function isClientProjectComplete(client) {
  return Boolean(client?.projectCompletedAt)
}

/** Signed until the project is finished; Completed only when project work is done */
export function resolveContractStatus(client, contract) {
  if (!client) return 'Not Started'
  if (!isClientContractSigned(client, contract)) return client.contractStatus
  return isClientProjectComplete(client) ? 'Completed' : 'Signed'
}

/** Align client.contractStatus when the contract record is already signed.
 *  Lease Signed also promotes the tenant to Official (out of Pending). */
export function reconcileClientContractStatus(client, contract) {
  if (!client) return client

  const signedOnRecord =
    contract?.signedAt &&
    contract?.confirmedByClient &&
    !isSignatureStale(contract)
  const timelineSigned = Boolean(client.timelineStepSkips?.contract_signed)
  const isSigned = isClientContractSigned(client, contract)

  if (!signedOnRecord && !timelineSigned && !isSigned) return client

  const targetContractStatus = resolveContractStatus(client, contract)
  const inProgress =
    Boolean(client.projectStartedAt) || client.projectStatus === 'In Progress'

  let projectStatus = client.projectStatus
  if (isSigned && !isClientProjectComplete(client)) {
    if (client.projectStatus === 'Completed' && !client.projectCompletedAt) {
      projectStatus = client.projectStartedAt ? 'In Progress' : 'Contract Signed'
    } else if (inProgress && projectStatus !== 'In Progress') {
      projectStatus = 'In Progress'
    } else if (
      !inProgress &&
      (projectStatus === 'Contract Sent' || projectStatus === 'Inquiry')
    ) {
      projectStatus = 'Contract Signed'
    }
  }

  const shouldPromoteOfficial = isSigned && !client.isOfficialClient
  if (
    client.contractStatus === targetContractStatus &&
    client.projectStatus === projectStatus &&
    !shouldPromoteOfficial
  ) {
    return client
  }

  return {
    ...client,
    contractStatus: targetContractStatus,
    projectStatus,
    ...(shouldPromoteOfficial
      ? {
          isOfficialClient: true,
          officialClientSince: client.officialClientSince ?? new Date().toISOString(),
        }
      : {}),
  }
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
    clientSignatureImage: undefined,
    clientSignDate: undefined,
    signedContentFingerprint: undefined,
    viewedAt: undefined,
  }
}

export function prepareContractForClientReview(contract, now = new Date().toISOString()) {
  const cleared = clearContractClientSignature(contract)
  const priorVersion = contract.leaseVersion ?? 1
  const history = Array.isArray(contract.versionHistory) ? [...contract.versionHistory] : []
  history.push({
    version: priorVersion,
    supersededAt: now,
    sentAt: contract.sentAt,
    contentFingerprint: contract.signedContentFingerprint || contractContentFingerprint(contract),
  })
  return {
    ...cleared,
    sentAt: now,
    contentUpdatedAt: now,
    leaseVersion: priorVersion + 1,
    versionHistory: history,
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
