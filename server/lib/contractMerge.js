/** Fields set by portal send/sign — must not be wiped by admin contract saves */
const PORTAL_FIELDS = [
  'sentAt',
  'viewedAt',
  'signedAt',
  'confirmedByClient',
  'clientSignature',
  'clientSignDate',
]

export function mergeContractDeliveryFields(existing, incoming) {
  if (!existing) return incoming
  const merged = { ...incoming }
  for (const field of PORTAL_FIELDS) {
    if (merged[field] === undefined && existing[field] !== undefined) {
      merged[field] = existing[field]
    }
  }
  return merged
}

export function mergeContractsList(existingContracts, incomingContracts) {
  const byId = new Map(existingContracts.map((c) => [c.id, c]))
  return incomingContracts.map((incoming) =>
    mergeContractDeliveryFields(byId.get(incoming.id), incoming)
  )
}

/** Repair contracts that were marked sent on the client but lost sentAt on the contract */
export function repairSentContracts(store, clientId) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store

  const clientWasSent =
    client.contractStatus === 'Sent' ||
    client.projectStatus === 'Contract Sent'

  if (!clientWasSent) return store

  let repaired = false
  const contracts = store.contracts.map((c) => {
    if (c.clientId !== clientId || c.sentAt) return c
    repaired = true
    return {
      ...c,
      sentAt: c.createdAt ?? new Date().toISOString(),
      confirmedByClient: c.confirmedByClient ?? false,
    }
  })

  return repaired ? { ...store, contracts } : store
}
