import type { PortalContractClientStatus } from '@/types'

export function getPortalContractStatus(contract: {
  sentAt?: string
  viewedAt?: string
  confirmedByClient?: boolean
}): PortalContractClientStatus {
  if (contract.confirmedByClient) return 'Accepted'
  if (contract.viewedAt) return 'Viewed'
  return 'Pending Review'
}

export function getPortalClientContractStatus(
  contracts: Array<{
    sentAt?: string
    viewedAt?: string
    confirmedByClient?: boolean
  }>
): PortalContractClientStatus | null {
  const active = contracts.filter((c) => c.sentAt)
  if (active.length === 0) return null

  const pending = active.filter((c) => !c.confirmedByClient)
  if (pending.length === 0) {
    return 'Accepted'
  }

  const needsReview = pending.find((c) => !c.viewedAt)
  if (needsReview) return 'Pending Review'

  const viewed = pending.find((c) => c.viewedAt)
  if (viewed) return 'Viewed'

  return 'Pending Review'
}
