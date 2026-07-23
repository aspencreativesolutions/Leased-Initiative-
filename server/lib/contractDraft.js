import { generateId } from './notifications.js'
import { migrateServiceTier } from './serviceTier.js'
import { contractNeedsDetail } from './contractPlaceholders.js'
import { buildResidentialLeaseFields } from './residentialLeaseTemplate.js'

/** Normalize property addresses for lease-by-address matching. */
export function normalizeLeaseAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Find a completed lease agreement already tied to the same property address
 * (another tenant's lease) so landlords can reuse / send instead of drafting from scratch.
 */
export function findReusableLeaseAtAddress(store, address, { excludeClientId } = {}) {
  const normalized = normalizeLeaseAddress(address)
  if (!normalized) return null

  const matches = (store.contracts ?? []).filter((contract) => {
    if (excludeClientId && contract.clientId === excludeClientId) return false
    if (normalizeLeaseAddress(contract.clientAddress) !== normalized) return false
    if (contract.leaseGenerationStatus === 'generating') return false
    return !contractNeedsDetail(contract)
  })

  if (matches.length === 0) return null

  const rank = (contract) => {
    if (contract.signedAt) return 4
    if (contract.sentAt) return 3
    if (contract.pdfGenerated) return 2
    return 1
  }

  return [...matches].sort((a, b) => rank(b) - rank(a))[0]
}

/** Clone an existing address-linked lease for a newly accepted tenant. */
export function cloneLeaseForClient(sourceContract, client, leaseOptions = {}) {
  const {
    id: _id,
    clientId: _clientId,
    sentAt: _sentAt,
    viewedAt: _viewedAt,
    signedAt: _signedAt,
    confirmedByClient: _confirmed,
    portalStatus: _portalStatus,
    createdAt: _createdAt,
    leaseGenerationStatus: _gen,
    leaseGenerationStartedAt: _genAt,
    versionHistory: _history,
    leaseVersion: _version,
    ...terms
  } = sourceContract

  const now = new Date().toISOString()
  return {
    ...terms,
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone || '',
    clientAddress:
      (leaseOptions.clientAddress && String(leaseOptions.clientAddress).trim()) ||
      sourceContract.clientAddress ||
      '',
    startDate: leaseOptions.startDate || sourceContract.startDate,
    completionDate: leaseOptions.completionDate || sourceContract.completionDate,
    paymentSchedule:
      leaseOptions.paymentSchedule ||
      sourceContract.paymentSchedule ||
      'Monthly rent due on the 1st of each month for the lease term.',
    projectTitle: client.projectName || sourceContract.projectTitle,
    isPlaceholderDraft: false,
    confirmedByClient: false,
    pdfGenerated: Boolean(sourceContract.pdfGenerated),
    leaseGenerationStatus: 'generating',
    leaseGenerationStartedAt: now,
    leaseVersion: 1,
    versionHistory: [],
    createdAt: now,
  }
}

/**
 * Whether the landlord should Draft vs Send for a pending/prospective tenant.
 * Returns 'generating' while the residential lease template is being prepared.
 */
export function resolveLeaseAgreementAction(client, contract) {
  if (contract?.leaseGenerationStatus === 'generating') return 'generating'
  if (client?.contractStatus === 'Cancelled') return 'draft'
  if (
    client?.contractStatus === 'Sent' ||
    client?.contractStatus === 'Signed' ||
    client?.contractStatus === 'Completed'
  ) {
    return 'view'
  }
  if (!contract) return 'draft'
  if (contract.leaseGenerationStatus === 'ready') return 'send'
  if (
    client?.contractStatus === 'Not Started' ||
    (contractNeedsDetail(contract) && contract.leaseGenerationStatus !== 'ready')
  ) {
    return 'draft'
  }
  return 'send'
}

/** Find a rental record by preferred / desired address. */
export function findPropertyForLease(store, address) {
  const normalized = normalizeLeaseAddress(address)
  if (!normalized) return null
  return (
    (store.properties ?? []).find(
      (p) => normalizeLeaseAddress(p.address) === normalized
    ) ?? null
  )
}

/**
 * Create a residential lease draft populated from applicant, landlord, and rental.
 * Starts in `generating` status unless leaseOptions.readyImmediately is true (demos / clones).
 */
export function createDraftContract(client, settings, leaseOptions = {}) {
  const property = leaseOptions.property || null
  const fields = buildResidentialLeaseFields({
    client,
    settings,
    property,
    leaseOptions,
  })
  const now = new Date().toISOString()
  const clientAddress =
    (leaseOptions.clientAddress && String(leaseOptions.clientAddress).trim()) ||
    (client.projectName && String(client.projectName).trim()) ||
    ''
  const readyImmediately = Boolean(leaseOptions.readyImmediately)

  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone || '',
    clientAddress,
    serviceTier: migrateServiceTier(client.serviceTier),
    projectTitle: fields.projectTitle,
    projectScope: fields.projectScope,
    servicesIncluded: fields.servicesIncluded,
    servicesNotIncluded: fields.servicesNotIncluded,
    deliverables: fields.deliverables,
    startDate: leaseOptions.startDate || fields.startDate,
    completionDate: leaseOptions.completionDate || fields.completionDate,
    totalCost: leaseOptions.totalCost || fields.totalCost,
    depositAmount: leaseOptions.depositAmount || fields.depositAmount,
    remainingBalance: leaseOptions.remainingBalance || fields.remainingBalance,
    paymentSchedule: fields.paymentSchedule,
    paymentProvider: 'paypal',
    allowPrepaidRent: true,
    paymentMethods: fields.paymentMethods,
    latePaymentPolicy: fields.latePaymentPolicy,
    revisionCount: fields.revisionCount,
    extraRevisionFee: fields.extraRevisionFee,
    revisionLimits: fields.revisionLimits,
    clientResponsibilities: fields.clientResponsibilities,
    communicationMethod: fields.communicationMethod,
    responseTime: fields.responseTime,
    meetingExpectations: fields.meetingExpectations,
    ownershipTerms: fields.ownershipTerms,
    portfolioRights: fields.portfolioRights,
    terminationTerms: fields.terminationTerms,
    designerSignature: settings.ownerName || '',
    isPlaceholderDraft: false,
    leaseGenerationStatus: readyImmediately ? 'ready' : 'generating',
    leaseGenerationStartedAt: now,
    ...(readyImmediately ? { leaseGenerationCompletedAt: now } : {}),
    leaseVersion: 1,
    versionHistory: [],
    createdAt: now,
  }
}

/** Complete lease generation — template is ready for View / Edit / Send. */
export function markLeaseGenerationReady(contract, now = new Date().toISOString()) {
  if (!contract || contract.leaseGenerationStatus === 'ready') return contract
  return {
    ...contract,
    leaseGenerationStatus: 'ready',
    leaseGenerationCompletedAt: now,
    isPlaceholderDraft: false,
  }
}

const GENERATION_MIN_MS = 2200

/** Flip generating → ready once the minimum generation window has elapsed. */
export function completeLeaseGenerationIfDue(contract, now = Date.now()) {
  if (!contract || contract.leaseGenerationStatus !== 'generating') return contract
  const started = contract.leaseGenerationStartedAt
    ? new Date(contract.leaseGenerationStartedAt).getTime()
    : 0
  if (!started || now - started < GENERATION_MIN_MS) return contract
  return markLeaseGenerationReady(contract, new Date(now).toISOString())
}

export { GENERATION_MIN_MS }
