import type { PortalContractClientStatus } from '@/types'

function isSignatureStale(contract: {
  sentAt?: string
  signedAt?: string
  confirmedByClient?: boolean
  contentUpdatedAt?: string
  signedContentFingerprint?: string
  projectTitle?: string
  totalCost?: string
  depositAmount?: string
}): boolean {
  if (!contract.confirmedByClient || !contract.signedAt) return false

  if (contract.sentAt && new Date(contract.signedAt).getTime() < new Date(contract.sentAt).getTime()) {
    return true
  }

  if (
    contract.contentUpdatedAt &&
    new Date(contract.signedAt).getTime() < new Date(contract.contentUpdatedAt).getTime()
  ) {
    return true
  }

  return false
}

function hasReviewedCurrentVersion(contract: {
  viewedAt?: string
  sentAt?: string
}): boolean {
  if (!contract.viewedAt || !contract.sentAt) return false
  return new Date(contract.viewedAt).getTime() >= new Date(contract.sentAt).getTime()
}

export function getPortalContractStatus(contract: {
  sentAt?: string
  viewedAt?: string
  confirmedByClient?: boolean
  signedAt?: string
  contentUpdatedAt?: string
  signedContentFingerprint?: string
}): PortalContractClientStatus {
  if (contract.confirmedByClient && !isSignatureStale(contract)) {
    return 'Accepted'
  }

  if (hasReviewedCurrentVersion(contract)) {
    return 'Viewed'
  }

  return 'Pending Review'
}

export function getPortalClientContractStatus(
  contracts: Array<{
    sentAt?: string
    viewedAt?: string
    confirmedByClient?: boolean
    signedAt?: string
    contentUpdatedAt?: string
  }>
): PortalContractClientStatus | null {
  const active = contracts.filter((c) => c.sentAt)
  if (active.length === 0) return null

  const statuses = active.map((c) => getPortalContractStatus(c))

  if (statuses.every((s) => s === 'Accepted')) return 'Accepted'
  if (statuses.some((s) => s === 'Pending Review')) return 'Pending Review'
  if (statuses.some((s) => s === 'Viewed')) return 'Viewed'

  return 'Pending Review'
}
