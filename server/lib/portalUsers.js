import { buildProjectTimeline } from './projectTimeline.js'
import {
  completeLeaseGenerationIfDue,
  resolveLeaseAgreementAction,
} from './contractDraft.js'
import { applySendContract, shouldAutoSendLeaseDrafts } from './sendContract.js'

/** True when an unlinked tenant has submitted agency + property preferences. */
export function hasSubmittedPortalApplication(user) {
  return Boolean(
    String(user?.preferredLandlordCompany ?? '').trim() &&
      String(user?.preferredPropertyAddress ?? '').trim()
  )
}

export function isPendingPortalRegistration(user) {
  return (
    user?.role === 'client' &&
    !user.clientId &&
    !user.registrationDismissed &&
    hasSubmittedPortalApplication(user)
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
    return { id: 'lease_ready', label: 'Lease Drafted' }
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
 * When auto-send is enabled, newly ready drafts are sent immediately.
 * Callers that read overview should persist when changed.
 */
export function advanceLeaseGenerations(store, now = Date.now()) {
  let changed = false
  const autoSend = shouldAutoSendLeaseDrafts(store.settings)
  const completedIds = []
  let contracts = (store.contracts ?? []).map((contract) => {
    const next = completeLeaseGenerationIfDue(contract, now)
    if (next !== contract) {
      changed = true
      if (
        autoSend &&
        contract.leaseGenerationStatus === 'generating' &&
        next.leaseGenerationStatus === 'ready' &&
        !next.sentAt
      ) {
        completedIds.push(next.id)
      }
    }
    return next
  })

  let nextStore = changed ? { ...store, contracts } : store

  for (const contractId of completedIds) {
    const sent = applySendContract(nextStore, contractId, new Date(now).toISOString())
    if (sent) {
      nextStore = sent.store
      changed = true
    }
  }

  if (!changed) return { store, changed: false }
  return { store: nextStore, changed: true }
}

export function buildPortalUsersOverview(store) {
  const handlerName = store.settings?.ownerName || 'Your Name'
  const handlerEmail = store.settings?.email || ''

  const pending = store.users
    .filter(isPendingPortalRegistration)
    .map((u) => {
      const phones = Array.isArray(u.roommateInvitePhones)
        ? u.roommateInvitePhones
            .map((phone) => String(phone ?? '').replace(/\D/g, ''))
            .filter((digits) => digits.length >= 10)
        : []
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        applicationSubmittedAt: u.applicationSubmittedAt || u.createdAt,
        preferredLeaseMonths: u.preferredLeaseMonths,
        preferredLandlordCompany: u.preferredLandlordCompany,
        preferredPropertyAddress: u.preferredPropertyAddress,
        preferredLeaseStartDate: u.preferredLeaseStartDate,
        preferredPaymentMethod: u.preferredPaymentMethod,
        phone: u.phone,
        preferredOccupancyMode: u.preferredOccupancyMode,
        preferredBedroomId: u.preferredBedroomId,
        preferredBedId: u.preferredBedId,
        roommateInvitePhones: phones,
        roommateInviteCount: phones.length,
        roommateInviteDelivery:
          u.roommateInviteDelivery === 'group' || u.roommateInviteDelivery === 'solo'
            ? u.roommateInviteDelivery
            : undefined,
        applicantPartyType: u.applicantPartyType,
        coupleCompanion: u.coupleCompanion,
        renterCategory: u.renterCategory,
      }
    })
    .sort((a, b) => {
      const aAt = new Date(a.applicationSubmittedAt || a.createdAt).getTime()
      const bAt = new Date(b.applicationSubmittedAt || b.createdAt).getTime()
      return bAt - aAt
    })

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
        Boolean(contract?.sentAt) &&
        (client.contractStatus === 'Sent' ||
          stage.id === 'contract_sent' ||
          stage.label === 'Lease Sent' ||
          stage.label === 'Lease Resent' ||
          Boolean(contract?.resentAt))
      // Keep status + actions aligned: Lease Sent/Resent only when a lease exists and was sent (not a draft).
      const canShowLeaseSent =
        leaseSent &&
        leaseAction !== 'draft' &&
        leaseAction !== 'generating' &&
        Boolean(contract?.sentAt)
      const leaseSentLabel = contract?.resentAt ? 'Lease Resent' : 'Lease Sent'
      const alignedStage = canShowLeaseSent
        ? { id: 'contract_sent', label: leaseSentLabel }
        : leaseAction === 'generating'
          ? { id: 'lease_generating', label: 'Generating Lease Agreement' }
          : stage.label === 'Lease Drafted' || stage.label === 'Lease Ready'
            ? { id: 'lease_ready', label: 'Lease Drafted' }
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
        preferredOccupancyMode:
          u.preferredOccupancyMode ?? client.preferredOccupancyMode ?? undefined,
        preferredBedroomId: u.preferredBedroomId ?? client.bedroomId ?? undefined,
        preferredBedId: u.preferredBedId ?? client.bedId ?? undefined,
        applicantPartyType: u.applicantPartyType ?? client.applicantPartyType ?? undefined,
        coupleCompanion: u.coupleCompanion ?? client.coupleCompanion ?? undefined,
        renterCategory: u.renterCategory ?? client.renterCategory ?? undefined,
        occupancyArrangement: client.occupancyArrangement,
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
        preferredOccupancyMode: client.preferredOccupancyMode ?? undefined,
        applicantPartyType: client.applicantPartyType ?? undefined,
        coupleCompanion: client.coupleCompanion ?? undefined,
        renterCategory: client.renterCategory ?? undefined,
        occupancyArrangement: client.occupancyArrangement,
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
