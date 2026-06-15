import { generateId } from './notifications.js'

const CONTRACT_WORKFLOW_STEPS = [
  'contract_sent',
  'contract_signed',
  'invoice_sent',
  'pay_link_clicked',
  'payment_confirmed',
]

function buildContractSnapshot(contract) {
  return {
    projectTitle: contract.projectTitle,
    clientName: contract.clientName,
    businessName: contract.businessName,
    serviceTier: contract.serviceTier,
    sentAt: contract.sentAt ?? null,
    signedAt: contract.signedAt ?? null,
    pdfGenerated: contract.pdfGenerated ?? false,
    createdAt: contract.createdAt,
  }
}

function resetClientAfterContractDeletion(client, contract, adminUser, deletedAt) {
  const timelineStepSkips = { ...(client.timelineStepSkips ?? {}) }
  for (const stepId of CONTRACT_WORKFLOW_STEPS) {
    delete timelineStepSkips[stepId]
  }

  const nextTimelineSkips =
    Object.keys(timelineStepSkips).length > 0 ? timelineStepSkips : undefined

  let projectStatus = client.projectStatus
  if (!client.projectStartedAt) {
    projectStatus = 'Inquiry'
  } else if (['Contract Sent', 'Contract Signed'].includes(projectStatus)) {
    projectStatus = 'In Progress'
  }

  const keepOfficial = Boolean(client.projectStartedAt)
  const deletionNote = {
    id: generateId(),
    text: contract
      ? `Contract permanently deleted by admin (${adminUser.email}) on ${new Date(deletedAt).toLocaleString()}. Contract ID: ${contract.id}. Project: "${contract.projectTitle}". Client record reset — start a new contract from scratch.`
      : `Contract workflow permanently cleared by admin (${adminUser.email}) on ${new Date(deletedAt).toLocaleString()}. No contract file was on record (client status was "${client.contractStatus}"). Client record reset — start a new contract from scratch.`,
    category: 'Contract',
    createdAt: deletedAt,
  }

  return {
    ...client,
    contractStatus: 'Not Started',
    projectStatus,
    paymentStatus: keepOfficial ? client.paymentStatus : 'Unpaid',
    invoice: undefined,
    depositPaymentConfirmedAt: undefined,
    timelineStepSkips: nextTimelineSkips,
    isOfficialClient: keepOfficial ? client.isOfficialClient : false,
    officialClientSince: keepOfficial ? client.officialClientSince : undefined,
    notes: [...(client.notes ?? []), deletionNote],
  }
}

function buildAuditEntry(client, contract, adminUser, deletedAt) {
  return {
    id: generateId(),
    type: 'contract_deleted',
    contractId: contract?.id ?? 'none',
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    projectTitle: contract?.projectTitle ?? client.projectName,
    deletedByUserId: adminUser.id,
    deletedByEmail: adminUser.email,
    deletedAt,
    summary: contract
      ? `Permanently deleted contract "${contract.projectTitle}" for ${client.name} (${client.businessName}).`
      : `Cleared contract workflow for ${client.name} (${client.businessName}). No contract record was stored.`,
    contractSnapshot: contract ? buildContractSnapshot(contract) : undefined,
  }
}

/**
 * Permanently remove a contract and reset all client-side contract workflow state.
 * Returns null when the contract does not exist.
 */
export function permanentlyDeleteContract(store, contractId, adminUser) {
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) return null

  const client = store.clients.find((c) => c.id === contract.clientId)
  if (!client) return null

  const deletedAt = new Date().toISOString()
  const auditEntry = buildAuditEntry(client, contract, adminUser, deletedAt)

  const nextClient = resetClientAfterContractDeletion(client, contract, adminUser, deletedAt)

  return {
    store: {
      ...store,
      contracts: store.contracts.filter((c) => c.id !== contractId),
      clients: store.clients.map((c) => (c.id === client.id ? nextClient : c)),
      adminNotifications: (store.adminNotifications ?? []).filter(
        (n) => n.contractId !== contractId
      ),
      adminAuditLog: [auditEntry, ...(store.adminAuditLog ?? [])],
    },
    auditEntry,
    clientId: client.id,
  }
}

/**
 * Delete a client's contract by client ID — uses stored contract if present,
 * otherwise clears orphaned contract workflow state (e.g. status "Sent" with no file).
 */
export function permanentlyDeleteClientContract(store, clientId, adminUser) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client || client.contractStatus === 'Not Started') return null

  const contract = store.contracts.find((c) => c.clientId === clientId)
  if (contract) {
    return permanentlyDeleteContract(store, contract.id, adminUser)
  }

  const deletedAt = new Date().toISOString()
  const auditEntry = buildAuditEntry(client, null, adminUser, deletedAt)
  const nextClient = resetClientAfterContractDeletion(client, null, adminUser, deletedAt)

  return {
    store: {
      ...store,
      clients: store.clients.map((c) => (c.id === clientId ? nextClient : c)),
      adminNotifications: (store.adminNotifications ?? []).filter(
        (n) => n.clientId !== clientId || n.type !== 'contract_signed'
      ),
      adminAuditLog: [auditEntry, ...(store.adminAuditLog ?? [])],
    },
    auditEntry,
    clientId,
  }
}
