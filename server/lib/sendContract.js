import { notifyClientByClientId } from './clientNotifications.js'

/**
 * Apply lease-send mutations to a store snapshot.
 * Returns null when the contract/client/portal user cannot be linked.
 */
export function applySendContract(store, contractId, now = new Date().toISOString()) {
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) return null

  const client = store.clients.find((c) => c.id === contract.clientId)
  if (!client) return null

  const clientEmail = client.email.trim().toLowerCase()
  let clientUser = store.users.find(
    (u) => u.role === 'client' && u.clientId === client.id
  )
  if (!clientUser) {
    clientUser = store.users.find(
      (u) => u.role === 'client' && u.email === clientEmail
    )
  }
  if (!clientUser) return null

  const wasAlreadySent = Boolean(contract.sentAt)
  let updatedContract = null

  let next = {
    ...store,
    users: store.users.map((u) =>
      u.id === clientUser.id && !u.clientId ? { ...u, clientId: client.id } : u
    ),
    contracts: store.contracts.map((c) => {
      if (c.id !== contractId) return c
      updatedContract = {
        ...c,
        sentAt: now,
        ...(wasAlreadySent ? { resentAt: now } : { resentAt: undefined }),
        viewedAt: undefined,
        signedAt: undefined,
        confirmedByClient: false,
        clientSignature: undefined,
        clientSignatureImage: undefined,
        clientSignDate: undefined,
      }
      return updatedContract
    }),
    clients: store.clients.map((c) => {
      if (c.id !== client.id) return c
      return {
        ...c,
        contractStatus: 'Sent',
        projectStatus: 'Contract Sent',
        accountUserId: c.accountUserId || clientUser.id,
      }
    }),
  }

  next = notifyClientByClientId(next, client.id, {
    type: 'contract_sent',
    title: 'Lease ready to review',
    message: `Your lease for "${contract.projectTitle}" is ready. Review and sign it in your portal.`,
    actionUrl: `/portal/contracts/${contractId}`,
    relatedId: `contract-sent-${contractId}`,
  })

  return {
    store: next,
    contract: updatedContract,
    clientUser,
    wasAlreadySent,
    sentAt: now,
  }
}

export function shouldAutoSendLeaseDrafts(settings) {
  return Boolean(settings?.autoSendLeaseDrafts)
}
