import { buildProjectTimeline } from './projectTimeline.js'
import {
  completeLeaseGenerationIfDue,
  resolveLeaseAgreementAction,
} from './contractDraft.js'

export function isPendingPortalRegistration(user) {
  return (
    user?.role === 'client' &&
    !user.clientId &&
    !user.registrationDismissed
  )
}

export function resolveClientTimelineStage(client, contract) {
  if (contract?.leaseGenerationStatus === 'generating') {
    return { id: 'lease_generating', label: 'Generating Lease Agreement' }
  }
  if (
    contract?.leaseGenerationStatus === 'ready' &&
    !contract?.sentAt &&
    client?.contractStatus !== 'Sent' &&
    client?.contractStatus !== 'Signed' &&
    client?.contractStatus !== 'Completed'
  ) {
    return { id: 'lease_ready', label: 'Lease Ready' }
  }

  const steps = buildProjectTimeline(client, contract ?? null)
  const active = steps.find((s) => s.status === 'active')
  if (active) {
    // Active contract_signed means the lease was sent and signature is still outstanding.
    if (active.id === 'contract_signed') {
      return {
        id: 'contract_sent',
        label: contract?.resentAt ? 'Lease Resent' : 'Lease Sent',
      }
    }
    return { id: active.id, label: active.label }
  }
  const completed = steps.filter((s) => s.status === 'completed')
  if (completed.length > 0) {
    const last = completed[completed.length - 1]
    return { id: last.id, label: last.label }
  }
  return { id: 'inquiry', label: 'Inquiry' }
}

/**
 * Advance any due lease generations. Returns { store, changed }.
 * Callers that read overview should persist when changed.
 */
export function advanceLeaseGenerations(store, now = Date.now()) {
  let changed = false
  const contracts = (store.contracts ?? []).map((contract) => {
    const next = completeLeaseGenerationIfDue(contract, now)
    if (next !== contract) changed = true
    return next
  })
  if (!changed) return { store, changed: false }
  return { store: { ...store, contracts }, changed: true }
}

export function buildPortalUsersOverview(store) {
  const handlerName = store.settings?.ownerName || 'Your Name'
  const handlerEmail = store.settings?.email || ''

  const pending = store.users
    .filter(isPendingPortalRegistration)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      preferredLeaseMonths: u.preferredLeaseMonths,
      preferredLandlordCompany: u.preferredLandlordCompany,
      preferredPropertyAddress: u.preferredPropertyAddress,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const accepted = store.users
    .filter((u) => u.role === 'client' && u.clientId)
    .map((u) => {
      const client = store.clients.find((c) => c.id === u.clientId)
      if (!client) return null
      const contract = store.contracts.find((c) => c.clientId === client.id)
      const stage = resolveClientTimelineStage(client, contract)
      const propertyAddress =
        (contract?.clientAddress && String(contract.clientAddress).trim()) ||
        (u.preferredPropertyAddress && String(u.preferredPropertyAddress).trim()) ||
        (client.projectName && String(client.projectName).trim()) ||
        ''
      const leaseAction = resolveLeaseAgreementAction(client, contract)
      const leaseFullySigned =
        client.contractStatus === 'Signed' ||
        client.contractStatus === 'Completed' ||
        Boolean(client.timelineStepSkips?.contract_signed) ||
        Boolean(contract?.signedAt && contract?.confirmedByClient)
      const leaseSent =
        !leaseFullySigned &&
        leaseAction !== 'generating' &&
        (client.contractStatus === 'Sent' ||
          Boolean(contract?.sentAt) ||
          stage.id === 'contract_sent' ||
          stage.label === 'Lease Sent' ||
          stage.label === 'Lease Resent')
      // Keep status + actions aligned: Lease Sent/Resent only when a lease exists and was sent (not a draft).
      const canShowLeaseSent =
        leaseSent &&
        leaseAction !== 'draft' &&
        leaseAction !== 'generating' &&
        Boolean(contract)
      const leaseSentLabel = contract?.resentAt ? 'Lease Resent' : 'Lease Sent'
      const alignedStage = canShowLeaseSent
        ? { id: 'contract_sent', label: leaseSentLabel }
        : leaseAction === 'generating'
          ? { id: 'lease_generating', label: 'Generating Lease Agreement' }
          : stage.label === 'Lease Ready'
            ? stage
            : stage.label === 'Lease Sent' ||
                stage.label === 'Lease Resent' ||
                stage.label === 'Awaiting Signature'
              ? {
                  id: leaseAction === 'draft' ? 'inquiry' : stage.id,
                  label:
                    leaseAction === 'draft'
                      ? 'Draft'
                      : stage.label === 'Awaiting Signature'
                        ? leaseSentLabel
                        : stage.label === 'Lease Sent' && contract?.resentAt
                          ? 'Lease Resent'
                          : stage.label,
                }
              : stage
      const alignedAction = canShowLeaseSent
        ? 'view'
        : leaseAction === 'generating'
          ? 'generating'
          : leaseAction
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        registeredAt: u.createdAt,
        clientId: client.id,
        clientName: client.name,
        projectName: client.projectName,
        propertyAddress: propertyAddress || undefined,
        contractStatus: client.contractStatus,
        hasLeaseAgreement:
          Boolean(contract) &&
          alignedAction !== 'draft' &&
          alignedAction !== 'generating',
        leaseAction: alignedAction,
        leaseGenerationStatus: contract?.leaseGenerationStatus,
        isOfficialClient: Boolean(client.isOfficialClient) || leaseFullySigned,
        timelineStageId: alignedStage.id,
        timelineStageLabel: alignedStage.label,
        acceptedAt: client.createdAt,
        handlerName,
        handlerEmail,
      }
    })
      .filter(Boolean)
      .sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime())

  const linkedClientIds = new Set(accepted.map((a) => a.clientId))
  const manualPending = (store.clients ?? [])
    .filter((client) => {
      if (!client || linkedClientIds.has(client.id)) return false
      if (client.isOfficialClient) return false
      if (client.contractStatus === 'Signed' || client.contractStatus === 'Completed') {
        return false
      }
      if (client.contractStatus === 'Cancelled') return false
      return true
    })
    .map((client) => {
      const contract = store.contracts.find((c) => c.clientId === client.id)
      const stage = resolveClientTimelineStage(client, contract)
      const propertyAddress =
        (contract?.clientAddress && String(contract.clientAddress).trim()) ||
        (client.projectName && String(client.projectName).trim()) ||
        ''
      const leaseAction = resolveLeaseAgreementAction(client, contract)
      return {
        userId: `manual-${client.id}`,
        name: client.name,
        email: client.email,
        registeredAt: client.createdAt,
        clientId: client.id,
        clientName: client.name,
        projectName: client.projectName,
        propertyAddress: propertyAddress || undefined,
        contractStatus: client.contractStatus,
        hasLeaseAgreement:
          Boolean(contract) &&
          leaseAction !== 'draft' &&
          leaseAction !== 'generating',
        leaseAction,
        leaseGenerationStatus: contract?.leaseGenerationStatus,
        isOfficialClient: false,
        timelineStageId: stage.id,
        timelineStageLabel: stage.label,
        acceptedAt: client.createdAt,
        handlerName,
        handlerEmail,
      }
    })

  const allAccepted = [...accepted, ...manualPending].sort(
    (a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
  )

  return {
    handlerName,
    handlerEmail,
    pending,
    accepted: allAccepted,
    pendingCount: pending.length,
    acceptedCount: allAccepted.length,
  }
}
