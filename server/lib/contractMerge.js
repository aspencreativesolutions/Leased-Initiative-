import { generateId } from './notifications.js'
import {
  contractContentFingerprint,
  hasContractContentChanged,
  needsClientResign,
  prepareContractForClientReview,
} from './contractReview.js'
import { contractNeedsDetail } from './contractPlaceholders.js'

/** Fields set by portal send/sign — must not be wiped by ordinary admin saves */
const PORTAL_FIELDS = [
  'sentAt',
  'viewedAt',
  'signedAt',
  'confirmedByClient',
  'clientSignature',
  'clientSignDate',
  'signedContentFingerprint',
  'contentUpdatedAt',
]

function buildRevisedContract(existing, incoming, now) {
  const merged = mergeContractDeliveryFields(existing, incoming)
  return prepareContractForClientReview(
    {
      ...merged,
      contentUpdatedAt: now,
    },
    now
  )
}

export function mergeContractOnAdminSave(existing, incoming, now = new Date().toISOString()) {
  if (!existing) {
    const contract = contractNeedsDetail(incoming)
      ? incoming
      : { ...incoming, isPlaceholderDraft: false }
    return { contract, revised: false }
  }

  const wasDelivered = Boolean(existing.sentAt)
  const contentChanged = hasContractContentChanged(existing, incoming)

  if (wasDelivered && contentChanged) {
    const contract = buildRevisedContract(existing, incoming, now)
    return {
      contract: contractNeedsDetail(contract) ? contract : { ...contract, isPlaceholderDraft: false },
      revised: true,
    }
  }

  let contract = mergeContractDeliveryFields(existing, incoming)
  if (contentChanged) {
    contract = { ...contract, contentUpdatedAt: now }
  }
  if (!contractNeedsDetail(contract)) {
    contract = { ...contract, isPlaceholderDraft: false }
  }

  return { contract, revised: false }
}

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

export function mergeContractsList(
  existingContracts,
  incomingContracts,
  clients = [],
  now = new Date().toISOString()
) {
  const byId = new Map(existingContracts.map((c) => [c.id, c]))
  const clientsById = new Map(clients.map((c) => [c.id, c]))
  const contracts = []
  const revisedClientIds = new Set()

  for (const incoming of incomingContracts) {
    const existing = byId.get(incoming.id)
    let { contract, revised } = mergeContractOnAdminSave(existing, incoming, now)

    const client = contract.clientId ? clientsById.get(contract.clientId) : undefined
    if (!revised && existing?.sentAt && needsClientResign(contract, client)) {
      contract = prepareContractForClientReview(contract, now)
      revised = true
    }

    contracts.push(contract)
    if (revised && contract.clientId) {
      revisedClientIds.add(contract.clientId)
    }
  }

  return { contracts, revisedClientIds: [...revisedClientIds] }
}

/** Reset client workflow when a sent contract is revised and re-delivered */
export function applyClientContractRevision(client, now = new Date().toISOString()) {
  const depositPaid = Boolean(client.depositPaymentConfirmedAt || client.invoice?.paidAt)

  const notes = [
    ...(client.notes ?? []),
    {
      id: generateId(),
      text: `Lease revised and re-sent to tenant portal on ${new Date(now).toLocaleDateString()}. Awaiting client review and signature.`,
      category: 'Contract',
      createdAt: now,
    },
  ]

  const updates = {
    contractStatus: 'Sent',
    notes,
  }

  if (!client.projectStartedAt) {
    updates.projectStatus = 'Contract Sent'
  }

  if (!depositPaid) {
    updates.isOfficialClient = false
    updates.officialClientSince = undefined
    updates.invoice = undefined
    updates.paymentStatus = 'Unpaid'
    updates.depositPaymentConfirmedAt = undefined
  }

  return { ...client, ...updates }
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

export { hasContractContentChanged, needsClientResign, prepareContractForClientReview }
