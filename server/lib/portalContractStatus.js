import { getPortalContractStatus as getStatus } from './contractReview.js'

export function getPortalContractStatus(contract) {
  return getStatus(contract)
}

export function getPortalClientContractStatus(contracts) {
  const active = contracts.filter((c) => c.sentAt)
  if (active.length === 0) return null

  const statuses = active.map((c) => getPortalContractStatus(c))

  if (statuses.every((s) => s === 'Accepted')) return 'Accepted'
  if (statuses.some((s) => s === 'Pending Review')) return 'Pending Review'
  if (statuses.some((s) => s === 'Viewed')) return 'Viewed'

  return 'Pending Review'
}
