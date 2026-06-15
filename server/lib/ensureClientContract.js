import { createDraftContract } from './contractDraft.js'
import { buildContractPlaceholderFields, contractNeedsDetail } from './contractPlaceholders.js'
import { pushAdminNotification } from './notifications.js'
import { TIMELINE_STEP_ORDER } from './timelineSteps.js'

export function stepsRequireContract(targetStepId) {
  const idx = TIMELINE_STEP_ORDER.indexOf(targetStepId)
  return idx >= TIMELINE_STEP_ORDER.indexOf('contract_sent')
}

export function stepsRequireProjectContract(targetStepId) {
  const idx = TIMELINE_STEP_ORDER.indexOf(targetStepId)
  return idx >= TIMELINE_STEP_ORDER.indexOf('project_started')
}

function clientExpectsSentContract(client) {
  return (
    ['Sent', 'Signed', 'Completed', 'Generated', 'Draft in Progress'].includes(
      client.contractStatus
    ) ||
    ['Contract Sent', 'Contract Signed', 'In Progress', 'Completed'].includes(
      client.projectStatus
    )
  )
}

function clientExpectsSignedContract(client) {
  return (
    client.contractStatus === 'Signed' ||
    client.contractStatus === 'Completed' ||
    ['Contract Signed', 'In Progress', 'Completed'].includes(client.projectStatus)
  )
}

function alignContractWithClientStatus(contract, client, now) {
  let next = contract

  if (clientExpectsSentContract(client) && !next.sentAt) {
    next = {
      ...next,
      sentAt: now,
    }
  }

  if (clientExpectsSignedContract(client) && !next.signedAt) {
    next = {
      ...next,
      sentAt: next.sentAt ?? now,
      signedAt: now,
      confirmedByClient: true,
      clientSignature: next.clientSignature || 'Acknowledged (placeholder contract)',
      clientSignDate: now.slice(0, 10),
    }
  }

  return next
}

function backfillPlaceholderFields(contract, client) {
  const placeholders = buildContractPlaceholderFields(client)
  let next = { ...contract, isPlaceholderDraft: contract.isPlaceholderDraft ?? true }
  let changed = false

  for (const [field, value] of Object.entries(placeholders)) {
    const current = next[field]?.trim?.() ?? ''
    if (!current) {
      next[field] = value
      changed = true
    }
  }

  return changed ? next : contract
}

export function repairClientContractSync(client, contract, settings) {
  if (!clientNeedsContractRecord(client)) {
    return { client, contract, changed: false, created: false, needsDetail: false }
  }

  if (!contract) {
    const ensured = ensureClientContract(client, null, settings)
    return { ...ensured, changed: true }
  }

  const now = new Date().toISOString()
  let nextContract = backfillPlaceholderFields(contract, client)
  nextContract = alignContractWithClientStatus(nextContract, client, now)
  const changed = nextContract !== contract

  return {
    client,
    contract: nextContract,
    created: false,
    changed,
    needsDetail: contractNeedsDetail(nextContract),
  }
}

export function ensureClientContract(client, contract, settings) {
  if (contract) {
    const repaired = repairClientContractSync(client, contract, settings)
    return {
      client: repaired.client,
      contract: repaired.contract,
      created: false,
      needsDetail: repaired.needsDetail,
    }
  }

  const now = new Date().toISOString()
  let nextContract = createDraftContract(client, settings)
  nextContract = alignContractWithClientStatus(nextContract, client, now)

  const nextClient = {
    ...client,
    contractStatus:
      client.contractStatus === 'Not Started' ? 'Draft in Progress' : client.contractStatus,
  }

  return {
    client: nextClient,
    contract: nextContract,
    created: true,
    needsDetail: contractNeedsDetail(nextContract),
  }
}

export function appendContractToStore(store, contract) {
  if (!contract) return store
  const exists = store.contracts.some((c) => c.id === contract.id || c.clientId === contract.clientId)
  if (exists) {
    return {
      ...store,
      contracts: store.contracts.map((c) => (c.clientId === contract.clientId ? contract : c)),
    }
  }
  return {
    ...store,
    contracts: [...store.contracts, contract],
  }
}

export function notifyContractNeedsDetail(store, client, contract) {
  if (!contractNeedsDetail(contract)) return store

  const alreadyNotified = (store.adminNotifications ?? []).some(
    (n) =>
      n.type === 'contract_needs_detail' &&
      n.clientId === client.id &&
      n.contractId === contract.id &&
      !n.read
  )
  if (alreadyNotified) return store

  return pushAdminNotification(store, {
    type: 'contract_needs_detail',
    clientId: client.id,
    contractId: contract.id,
    title: 'Contract needs details',
    message: `A placeholder contract for ${client.name} was auto-generated. Review services, pricing, and deliverables before the client signs.`,
  })
}

export function clientNeedsContractRecord(client) {
  return (
    clientExpectsSentContract(client) ||
    client.projectStatus === 'In Progress' ||
    Boolean(client.projectStartedAt) ||
    Boolean(client.timelineStepSkips?.project_started) ||
    Boolean(client.timelineStepSkips?.contract_sent) ||
    Boolean(client.timelineStepSkips?.contract_signed)
  )
}
