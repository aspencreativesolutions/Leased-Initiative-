export function getPortalContractStatus(contract) {
  if (contract.confirmedByClient) return 'Accepted'
  if (contract.viewedAt) return 'Viewed'
  return 'Pending Review'
}

export function getPortalClientContractStatus(contracts) {
  const active = contracts.filter((c) => c.sentAt)
  if (active.length === 0) return null

  const pending = active.filter((c) => !c.confirmedByClient)
  if (pending.length === 0) return 'Accepted'

  if (pending.some((c) => !c.viewedAt)) return 'Pending Review'
  if (pending.some((c) => c.viewedAt)) return 'Viewed'

  return 'Pending Review'
}
