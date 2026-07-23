import { isSampleClientEmail } from '@/data/sampleClients'
import { migrateSampleAddress } from '@/data/seed'
import { PLACEHOLDER_MARKER } from '@/lib/contractPlaceholders'
import {
  computeLeaseEndDate,
  resolveScheduleAsOf,
} from '@/lib/leaseSchedule'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { formatDate, formatShortMonthDate } from '@/lib/utils'
import type {
  Client,
  ContractData,
  ContractStatus,
  Note,
  ProjectStatus,
  ProjectType,
  ServiceTier,
} from '@/types'

/** Days before lease end when status becomes Ending Soon. */
export const LEASE_ENDING_SOON_DAYS = 30

/** Lease Agreements tiles: highlight days remaining within ~3 months of end. */
export const LEASE_TILE_ENDING_ALERT_DAYS = 90

export type LeaseTimelineState = 'Upcoming' | 'Active' | 'Ending Soon' | 'Expired'

export interface LeaseTermProgress {
  startDate?: string
  endDate?: string
  /** Current month of occupancy (1…termMonths), when known */
  currentMonth?: number
  /** Total lease length in months, when known */
  termMonths?: number
  /** 0–100 when start and end are known; null otherwise */
  percentComplete: number | null
  daysElapsed: number | null
  daysRemaining: number | null
  totalDays: number | null
  /** True when the lease is underway and ends within LEASE_TILE_ENDING_ALERT_DAYS */
  showEndingAlert: boolean
  state?: LeaseTimelineState
}

const PROPERTY_TYPES: readonly ProjectType[] = [
  'Apartment',
  'House',
  'Condo',
  'Townhouse',
  'Duplex',
]

export function migratePropertyType(value?: string): ProjectType {
  if (!value?.trim()) return 'House'
  const trimmed = value.trim()
  if ((PROPERTY_TYPES as readonly string[]).includes(trimmed)) {
    return trimmed as ProjectType
  }
  // Legacy / housing-type labels used on older mock records
  if (trimmed === 'Other' || trimmed === 'Single-Family Home') return 'House'
  if (trimmed === 'Condominium (Condo)') return 'Condo'
  return 'House'
}

function isUsableContractDate(value?: string): value is string {
  if (!value?.trim()) return false
  if (value.includes(PLACEHOLDER_MARKER)) return false
  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime())
}

/** First name from a full display name (falls back to the trimmed string). */
export function getFirstName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name
  return trimmed.split(/\s+/)[0] ?? trimmed
}

/** Property address for tenant rows — contract address, else project/address field */
export function getTenantAddress(client: Client, contract?: ContractData): string {
  const fromContract = contract?.clientAddress?.trim()
  if (fromContract && !fromContract.includes(PLACEHOLDER_MARKER)) return fromContract
  return client.projectName?.trim() || '—'
}

export interface LeaseStatusDetails {
  /** Compact badge label, e.g. "Month 6 of 12" */
  status: string
  /** Timeline state used for badge styling */
  state?: LeaseTimelineState
  /** Current month of occupancy (1…termMonths), when known */
  currentMonth?: number
  /** Total lease length in months, when known */
  termMonths?: number
  /** Optional end date (YYYY-MM-DD) shown beneath the status */
  endDate?: string
  startDate?: string
  /** Whole days until lease end (Ending Soon); 0 = ends today */
  daysRemaining?: number
  /** Whole days until lease start (Upcoming); 0 = starts today */
  daysUntilStart?: number
}

/** Hover copy for lease status badges — start date when in term, else timing detail. */
export function getLeaseStatusHoverDetail(details: LeaseStatusDetails): string | undefined {
  if (
    details.startDate &&
    details.currentMonth != null &&
    details.termMonths != null &&
    (details.state === 'Active' || details.state === 'Ending Soon')
  ) {
    return `Started ${formatShortMonthDate(details.startDate)}`
  }
  if (details.state === 'Ending Soon' && details.daysRemaining != null) {
    const days = details.daysRemaining
    if (days <= 0) return 'Ends today'
    return `${days} day${days === 1 ? '' : 's'} left`
  }
  if (details.state === 'Upcoming' && details.daysUntilStart != null) {
    const days = details.daysUntilStart
    if (days <= 0) return 'Starts today'
    return `Starts in ${days} day${days === 1 ? '' : 's'}`
  }
  return undefined
}

function parseLocalYmd(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value.slice(0, 10)}T12:00:00`)
}

function toCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function ymdKey(value: string): string {
  return value.slice(0, 10)
}

/** Whole calendar months elapsed from lease start through asOf (clamped ≥ 0). */
function monthsIntoLease(startYmd: string, asOf: Date): number {
  const start = parseLocalYmd(startYmd)
  if (Number.isNaN(start.getTime())) return 0
  let months =
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  if (asOf.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

function resolveLeaseTermMonths(client: Client, contract?: ContractData): number | undefined {
  if (client.leaseLengthMonths && client.leaseLengthMonths > 0) {
    return client.leaseLengthMonths
  }
  const start = isUsableContractDate(contract?.startDate) ? contract!.startDate : undefined
  const end = isUsableContractDate(contract?.completionDate) ? contract!.completionDate : undefined
  if (!start || !end) return undefined
  const startDate = parseLocalYmd(start)
  const endDate = parseLocalYmd(end)
  return Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  )
}

function resolveLeaseStartYmd(client: Client, contract?: ContractData): string | undefined {
  if (isUsableContractDate(contract?.startDate)) return ymdKey(contract!.startDate)
  if (isUsableContractDate(client.demoLeaseStartDate)) return ymdKey(client.demoLeaseStartDate!)
  return undefined
}

function resolveLeaseEndYmd(
  contract: ContractData | undefined,
  start: string | undefined,
  termMonths: number | undefined
): string | undefined {
  if (isUsableContractDate(contract?.completionDate)) return ymdKey(contract!.completionDate)
  if (start && termMonths && termMonths > 0) return computeLeaseEndDate(start, termMonths)
  return undefined
}

function daysUntilYmd(asOf: Date, endYmd: string): number {
  const end = toCalendarDay(parseLocalYmd(endYmd))
  const start = toCalendarDay(asOf)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function resolveLeaseTimelineState(
  start: string | undefined,
  end: string | undefined,
  asOf: Date
): LeaseTimelineState | undefined {
  if (!start) return undefined
  const asOfDay = toCalendarDay(asOf)
  const startDay = toCalendarDay(parseLocalYmd(start))
  if (asOfDay < startDay) return 'Upcoming'
  if (end) {
    const endDay = toCalendarDay(parseLocalYmd(end))
    if (asOfDay > endDay) return 'Expired'
    if (daysUntilYmd(asOf, end) <= LEASE_ENDING_SOON_DAYS) return 'Ending Soon'
  }
  return 'Active'
}

function formatLeaseStatusBadgeLabel(
  state: LeaseTimelineState,
  currentMonth: number | undefined,
  termMonths: number | undefined
): string {
  if (
    (state === 'Active' || state === 'Ending Soon') &&
    currentMonth != null &&
    termMonths != null
  ) {
    return `Month ${currentMonth} of ${termMonths}`
  }
  if (state === 'Upcoming' && termMonths != null) {
    return `Upcoming · ${termMonths}-Month Lease`
  }
  if (state === 'Expired') {
    return 'Expired'
  }
  return state
}

/** Timeline lease status plus optional end date for tenant table cells. */
export function getLeaseStatusDetails(
  client: Client,
  contract?: ContractData,
  asOf?: Date
): LeaseStatusDetails {
  const effectiveAsOf = resolveScheduleAsOf(asOf)
  const start = resolveLeaseStartYmd(client, contract)
  const termMonths = resolveLeaseTermMonths(client, contract)
  const end = resolveLeaseEndYmd(contract, start, termMonths)
  const state = resolveLeaseTimelineState(start, end, effectiveAsOf)

  if (start && termMonths && state) {
    const elapsed = monthsIntoLease(start, effectiveAsOf)
    const currentMonth =
      state === 'Upcoming'
        ? undefined
        : Math.min(Math.max(elapsed, 1), termMonths)

    return {
      status: formatLeaseStatusBadgeLabel(state, currentMonth, termMonths),
      state,
      currentMonth,
      termMonths,
      endDate: end,
      startDate: start,
      daysRemaining:
        state === 'Ending Soon' && end
          ? Math.max(0, daysUntilYmd(effectiveAsOf, end))
          : undefined,
      daysUntilStart:
        state === 'Upcoming'
          ? Math.max(0, daysUntilYmd(effectiveAsOf, start))
          : undefined,
    }
  }

  if (termMonths) {
    return {
      status: `${termMonths}-month lease`,
      termMonths,
      endDate: end,
      startDate: start,
    }
  }

  if (end) {
    return { status: `Ends ${formatDate(end)}`, endDate: end, startDate: start }
  }

  const fallback: Record<ProjectStatus, string> = {
    Inquiry: 'Inquiry',
    'In Progress': 'Active',
    'Contract Sent': 'Lease Agreement Sent',
    'Contract Signed': 'Lease Agreement Signed',
    Completed: 'Ended',
    'Follow-Up Needed': 'Follow-Up Needed',
  }
  return { status: fallback[client.projectStatus] ?? client.projectStatus }
}

/** Single-line lease status (timeline text only). */
export function getLeaseStatusLabel(client: Client, contract?: ContractData): string {
  return getLeaseStatusDetails(client, contract).status
}

/**
 * Term progress for Lease Agreements tiles: percent through the lease,
 * days elapsed / remaining, and a three-month ending alert.
 */
export function getLeaseTermProgress(
  client: Client,
  contract?: ContractData,
  asOf?: Date
): LeaseTermProgress {
  const details = getLeaseStatusDetails(client, contract, asOf)
  const startDate = details.startDate
  const endDate = details.endDate
  const state = details.state
  const effectiveAsOf = resolveScheduleAsOf(asOf)

  if (!startDate || !endDate) {
    return {
      startDate,
      endDate,
      currentMonth: details.currentMonth,
      termMonths: details.termMonths,
      percentComplete: null,
      daysElapsed: null,
      daysRemaining: null,
      totalDays: null,
      showEndingAlert: false,
      state,
    }
  }

  const asOfDay = toCalendarDay(effectiveAsOf)
  const asOfYmd = [
    asOfDay.getFullYear(),
    String(asOfDay.getMonth() + 1).padStart(2, '0'),
    String(asOfDay.getDate()).padStart(2, '0'),
  ].join('-')

  const totalDays = Math.max(1, daysUntilYmd(parseLocalYmd(startDate), endDate))
  const daysFromStart = daysUntilYmd(parseLocalYmd(startDate), asOfYmd)
  const daysRemainingRaw = daysUntilYmd(effectiveAsOf, endDate)

  let percentComplete: number
  let daysElapsed: number
  let daysRemaining: number

  if (state === 'Upcoming' || daysFromStart < 0) {
    percentComplete = 0
    daysElapsed = 0
    daysRemaining = Math.max(0, daysRemainingRaw)
  } else if (state === 'Expired' || daysRemainingRaw < 0) {
    percentComplete = 100
    daysElapsed = totalDays
    daysRemaining = 0
  } else {
    daysElapsed = Math.min(totalDays, Math.max(0, daysFromStart))
    daysRemaining = Math.max(0, daysRemainingRaw)
    percentComplete = Math.min(
      100,
      Math.max(0, Math.round((daysElapsed / totalDays) * 100))
    )
  }

  const showEndingAlert =
    (state === 'Active' || state === 'Ending Soon') &&
    daysRemaining <= LEASE_TILE_ENDING_ALERT_DAYS

  return {
    startDate,
    endDate,
    currentMonth: details.currentMonth,
    termMonths: details.termMonths,
    percentComplete,
    daysElapsed,
    daysRemaining,
    totalDays,
    showEndingAlert,
    state,
  }
}

/** True when as-of falls within the signed lease term (Active or Ending Soon). */
export function isLeaseCurrentlyInTerm(
  client: Client,
  contract?: ContractData,
  asOf?: Date
): boolean {
  const state = getLeaseStatusDetails(client, contract, asOf).state
  return state === 'Active' || state === 'Ending Soon'
}

/**
 * Official Tenants directory: signed leases that are upcoming or currently in term.
 * Expired leases are omitted so the list reflects active (and soon-to-start) occupancy.
 */
export function shouldShowInOfficialTenants(
  client: Client,
  contract?: ContractData,
  asOf?: Date
): boolean {
  if (!client.isOfficialClient) return false
  const state = getLeaseStatusDetails(client, contract, asOf).state
  if (!state) return true
  return state !== 'Expired'
}

const SIGNED_CONTRACT_STATUSES = ['Signed', 'Completed'] as const
const CONTRACT_STATUSES_NEEDING_RESET = [
  'Generated',
  'Sent',
  'Signed',
  'Completed',
] as const

export function getClientServiceTier(
  client: Client,
  contract?: ContractData
): ServiceTier {
  return migrateServiceTier(client.serviceTier ?? contract?.serviceTier)
}

export interface ServiceTierChangeResult {
  clientUpdates: Partial<Client>
  contract?: ContractData
  note?: Omit<Note, 'id' | 'createdAt'>
  requiresResend: boolean
  previousTier: ServiceTier
}

export function buildServiceTierChangeResult(
  client: Client,
  contract: ContractData | undefined,
  newTier: ServiceTier
): ServiceTierChangeResult | null {
  const previousTier = getClientServiceTier(client, contract)
  if (previousTier === newTier) return null

  const clientUpdates: Partial<Client> = { serviceTier: newTier }
  const contractWasInProgress =
    contract &&
    (contract.pdfGenerated ||
      CONTRACT_STATUSES_NEEDING_RESET.includes(
        client.contractStatus as (typeof CONTRACT_STATUSES_NEEDING_RESET)[number]
      ))

  if (!contractWasInProgress) {
    return {
      clientUpdates,
      contract: contract ? { ...contract, serviceTier: newTier } : undefined,
      requiresResend: false,
      previousTier,
    }
  }

  clientUpdates.contractStatus = 'Draft in Progress'
  if (
    client.projectStatus === 'Contract Signed' ||
    client.projectStatus === 'Completed'
  ) {
    clientUpdates.projectStatus = 'Contract Sent'
  }

  if (client.isOfficialClient) {
    clientUpdates.isOfficialClient = false
    clientUpdates.officialClientSince = undefined
  }

  const updatedContract: ContractData = {
    ...contract!,
    serviceTier: newTier,
    pdfGenerated: false,
    sentAt: undefined,
    viewedAt: undefined,
    signedAt: undefined,
    confirmedByClient: false,
    clientSignature: undefined,
    clientSignDate: undefined,
  }

  return {
    clientUpdates,
    contract: updatedContract,
    note: {
      text: `Service tier changed from ${previousTier} to ${newTier}. Revise the lease and resend it to the tenant.`,
      category: 'Contract',
    },
    requiresResend: true,
    previousTier,
  }
}

export function isPendingClient(client: Client): boolean {
  return !client.isOfficialClient
}

function isProjectComplete(client: Client): boolean {
  return Boolean(client.projectCompletedAt)
}

function inferSignedFromContractRecord(
  client: Client,
  contract?: ContractData
): boolean {
  if (client.timelineStepSkips?.contract_signed) return true

  if (contract?.signedAt && contract.confirmedByClient) {
    if (
      contract.sentAt &&
      new Date(contract.signedAt).getTime() < new Date(contract.sentAt).getTime()
    ) {
      return false
    }
    if (
      contract.contentUpdatedAt &&
      new Date(contract.signedAt).getTime() < new Date(contract.contentUpdatedAt).getTime()
    ) {
      return false
    }
    return true
  }

  return false
}

function isStoredContractSigned(client: Client): boolean {
  return client.contractStatus === 'Signed' || client.contractStatus === 'Completed'
}

export function isContractSigned(client: Client, contract?: ContractData): boolean {
  const status = getDisplayContractStatus(client, contract)
  return status === 'Signed' || status === 'Completed'
}

/** Contract status for UI when client.contractStatus lags behind the signed contract record */
export function getDisplayContractStatus(
  client: Client,
  contract?: ContractData
): ContractStatus {
  if (client.contractStatus === 'Cancelled') return 'Cancelled'

  const signed =
    isStoredContractSigned(client) || inferSignedFromContractRecord(client, contract)

  if (signed) {
    return isProjectComplete(client) ? 'Completed' : 'Signed'
  }

  return client.contractStatus
}

/**
 * Lease Agreements tile/table badge: Sent → Signed (upcoming) → Active (term underway).
 * Signed leases whose start date has arrived (or already passed) show as Active.
 */
export function getLeaseAgreementBadgeLabel(
  client: Client,
  contract?: ContractData,
  asOf?: Date
): string {
  const status = getDisplayContractStatus(client, contract)
  if (status === 'Sent') return 'Sent'
  if (status === 'Completed') return 'Completed'
  if (status === 'Signed') {
    const { state } = getLeaseStatusDetails(client, contract, asOf)
    if (state === 'Active' || state === 'Ending Soon') return 'Active'
    if (state === 'Expired') return 'Completed'
    return 'Signed'
  }
  return status
}

/** Sort rank for Lease Agreements status badges (lower = earlier in workflow). */
export function getLeaseAgreementBadgeRank(label: string): number {
  switch (label) {
    case 'Not Started':
      return 0
    case 'Draft in Progress':
      return 1
    case 'Generated':
      return 2
    case 'Sent':
      return 3
    case 'Signed':
      return 4
    case 'Active':
      return 5
    case 'Completed':
      return 6
    case 'Cancelled':
      return 7
    default:
      return 99
  }
}

/**
 * Lease Agreements Display Settings → Lease Status cycle (after Any).
 * Order: Any → Signed → Sent → Active → Any
 */
export const LEASE_AGREEMENT_STATUS_FILTERS = [
  'Signed',
  'Sent',
  'Active',
] as const

export type LeaseAgreementStatusFilter =
  (typeof LEASE_AGREEMENT_STATUS_FILTERS)[number]

/** Full cycle including Any (null) for the Display Settings status button. */
export const LEASE_AGREEMENT_STATUS_CYCLE = [
  null,
  ...LEASE_AGREEMENT_STATUS_FILTERS,
] as const satisfies ReadonlyArray<LeaseAgreementStatusFilter | null>

export function isLeaseAgreementStatusFilter(
  value: string | null | undefined
): value is LeaseAgreementStatusFilter {
  return (
    value != null &&
    (LEASE_AGREEMENT_STATUS_FILTERS as readonly string[]).includes(value)
  )
}

/** Button label for the Lease Status cycle control (`null` → Any). */
export function getLeaseAgreementStatusFilterLabel(
  filter: LeaseAgreementStatusFilter | null
): string {
  return filter ?? 'Any'
}

/** Advance Any → Signed → Sent → Active → Any. */
export function nextLeaseAgreementStatusFilter(
  current: LeaseAgreementStatusFilter | null
): LeaseAgreementStatusFilter | null {
  const cycle = LEASE_AGREEMENT_STATUS_CYCLE
  const idx = cycle.findIndex((s) => s === current)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % cycle.length
  return cycle[nextIdx] ?? null
}

export function getContractActionLabel(status: ContractStatus): string {
  if (status === 'Not Started' || status === 'Draft in Progress') return 'Draft Lease Agreement'
  if (status === 'Generated') return 'Send Lease Agreement'
  if (SIGNED_CONTRACT_STATUSES.includes(status as (typeof SIGNED_CONTRACT_STATUSES)[number])) {
    return 'Revise Lease Agreement'
  }
  return 'View / Edit Lease Agreement'
}

/** Pending / prospective tenant row CTA — Draft when no ready lease, Send when one exists. */
export function getPendingLeaseAgreementActionLabel(
  action: 'draft' | 'send' | 'view' | 'generating' | undefined,
  status?: ContractStatus
): string {
  if (action === 'generating') return 'Generating Lease Agreement'
  if (action === 'send') return 'Send'
  if (action === 'view') return getContractActionLabel(status ?? 'Sent')
  if (action === 'draft') return 'Draft Lease Agreement'
  return getContractActionLabel(status ?? 'Not Started')
}

export function canViewClientContract(
  contract: ContractData | undefined,
  status: ContractStatus
): boolean {
  return Boolean(contract) && status !== 'Not Started' && status !== 'Cancelled'
}

export function hasPaymentLinkClicked(client: Client): boolean {
  return (
    client.paymentStatus === 'Pay Link Clicked' ||
    client.paymentStatus === 'Deposit Paid' ||
    client.paymentStatus === 'Paid' ||
    Boolean(client.invoice?.paymentLinkClickedAt) ||
    Boolean(client.timelineStepSkips?.pay_link_clicked)
  )
}

export function canStartProject(client: Client): boolean {
  return (
    isContractSigned(client) &&
    hasPaymentLinkClicked(client) &&
    !client.projectStartedAt
  )
}

/** @deprecated Prefer getLeaseStatusLabel for dashboard rows */
export function getDashboardProjectStatusLabel(status: ProjectStatus): string | undefined {
  if (status === 'In Progress') return 'Active'
  if (status === 'Contract Sent') return 'Lease Agreement Sent'
  if (status === 'Contract Signed') return 'Lease Agreement Signed'
  if (status === 'Completed') return 'Ended'
  return undefined
}

/** User-facing project/lease stage label (keeps stored enum values unchanged) */
export function getProjectStatusDisplayLabel(status: ProjectStatus): string {
  if (status === 'Contract Sent') return 'Lease Agreement Sent'
  if (status === 'Contract Signed') return 'Lease Agreement Signed'
  return status
}

export function isProjectActive(client: Client): boolean {
  return Boolean(
    client.projectStartedAt ||
      client.projectStatus === 'In Progress' ||
      client.timelineStepSkips?.project_started
  )
}

export function countOfficialClients(clients: Client[]): number {
  return clients.filter((c) => c.isOfficialClient).length
}

export function countPendingClients(clients: Client[]): number {
  return clients.filter((c) => isPendingClient(c)).length
}

export function canMarkOfficialClient(client: Client): boolean {
  return SIGNED_CONTRACT_STATUSES.includes(
    client.contractStatus as (typeof SIGNED_CONTRACT_STATUSES)[number]
  )
}

/** Parse "$5,000" or "5000" into a number */
export function parseMoney(value?: string): number | null {
  if (!value?.trim()) return null
  const cleaned = value.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function getRemainingBalanceAmount(contract: ContractData | undefined): number | null {
  if (!contract) return null
  let amount = parseMoney(contract.remainingBalance)
  if (!amount) {
    const total = parseMoney(contract.totalCost)
    const deposit = parseMoney(contract.depositAmount)
    if (total && deposit && total > deposit) {
      amount = Math.round((total - deposit) * 100) / 100
    }
  }
  return amount
}

export function hasRemainingBalanceDue(contract: ContractData | undefined): boolean {
  if (!contract) return false
  const amount = getRemainingBalanceAmount(contract)
  if (!amount) return false
  const total = parseMoney(contract.totalCost)
  const deposit = parseMoney(contract.depositAmount)
  const hasSplitPayment = Boolean(total && deposit && total > deposit)
  return hasSplitPayment || Boolean(contract.remainingBalance?.trim())
}

export function isDepositInvoicePaid(client: Client): boolean {
  return Boolean(
    client.invoice?.paidAt ||
    client.depositPaymentConfirmedAt ||
    client.paymentStatus === 'Deposit Paid' ||
    client.paymentStatus === 'Paid'
  )
}

export function getClientAmountPaid(
  client: Client,
  contract?: ContractData
): { amount: number; currency: string } | null {
  const currency = client.invoice?.currency ?? client.finalInvoice?.currency ?? 'USD'

  if (client.finalInvoice?.paidAt) {
    const deposit =
      client.invoice?.amount ?? parseMoney(contract?.depositAmount) ?? 0
    return { amount: deposit + client.finalInvoice.amount, currency }
  }

  if (isDepositInvoicePaid(client)) {
    const amount = client.invoice?.amount ?? parseMoney(contract?.depositAmount)
    if (amount != null) return { amount, currency }
  }

  return null
}

export function suggestedInvoiceFromContract(
  contract: ContractData | undefined,
  client: Client
): { amount: number; description: string } | null {
  if (!contract) return null
  const amount =
    parseMoney(contract.depositAmount) ??
    parseMoney(contract.remainingBalance) ??
    parseMoney(contract.totalCost)
  if (!amount) return null
  return {
    amount,
    description: `${client.projectName} — ${contract.projectTitle}`,
  }
}

export function normalizeClient(raw: Partial<Client> & { id: string }): Client {
  return {
    name: '',
    businessName: '',
    email: '',
    phone: '',
    projectStatus: 'Inquiry',
    contractStatus: 'Not Started',
    paymentStatus: 'Unpaid',
    createdAt: new Date().toISOString(),
    ...raw,
    id: raw.id,
    projectName: migrateSampleAddress(raw.projectName) ?? raw.projectName ?? '',
    projectType: migratePropertyType(raw.projectType),
    isOfficialClient: raw.isOfficialClient ?? false,
    isSampleClient:
      raw.isSampleClient ?? (raw.email ? isSampleClientEmail(raw.email) : false),
    notes: raw.notes ?? [],
    deadlines: raw.deadlines ?? [],
    serviceTier: migrateServiceTier(raw.serviceTier),
  } as Client
}

export function paymentStatusAfterCapture(
  current: Client['paymentStatus'],
  invoiceAmount: number,
  contract?: ContractData
): Client['paymentStatus'] {
  const total = contract ? parseMoney(contract.totalCost) : null
  const deposit = contract ? parseMoney(contract.depositAmount) : null
  if (total && invoiceAmount >= total) return 'Paid'
  if (deposit && invoiceAmount >= deposit) return 'Deposit Paid'
  if (current === 'Unpaid') return 'Partial'
  return current === 'Overdue' ? 'Partial' : current
}
