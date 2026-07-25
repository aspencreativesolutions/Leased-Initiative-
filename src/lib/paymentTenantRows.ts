import {
  getRemainingBalanceAmount,
  getTenantAddress,
  parseMoney,
} from '@/lib/clientUtils'
import { getDemoAsOfYmd } from '@/lib/demoClock'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import {
  buildPaymentStatusPresentation,
  resolvePaymentSituation,
  situationStatusLabel,
  situationToDisplay,
  type PaymentSituation,
  type PaymentStatusPresentation,
} from '@/lib/paymentStatusPresentation'
import { isPublicDemoSession } from '@/lib/publicDemo'
import {
  formatUsd,
  resolvePropertyMonthlyRent,
  resolveTenantRentResponsibility,
  tenantMonthlyShare,
} from '@/lib/rentalRent'
import { findPropertyByAddress } from '@/lib/properties'
import type { Client, ContractData, PaymentStatus, PortalRentPayment, Property } from '@/types'

export type PaymentDisplay = 'Paid' | 'Due' | 'Overdue' | 'Paid Early'

export interface TenantPaymentRow {
  client: Client
  contract?: ContractData
  address: string
  /** Unit designation when present (Unit A, Apt 11, …) */
  unitLabel: string | null
  display: PaymentDisplay
  /** Clear situation label (Current, Overdue, Paid in Full, …) */
  situation: PaymentSituation
  statusLabel: string
  presentation: PaymentStatusPresentation
  paymentStatus: PaymentStatus
  /** Most recent rent received date (paidAt, else due date) */
  lastPaymentMadeOn: string | null
  nextDueDate: string | null
  daysUntilNextDue: number | null
  finalDueDate: string | null
  /** Final due only while that installment is still unpaid */
  outstandingFinalDueDate: string | null
  leaseEndDate: string | null
  leaseStartDate: string | null
  leaseLengthMonths: number | null
  overduePaymentCount: number
  overdueAmount: number | null
  /** Shared month-by-month schedule (same source as Tenant Portal) */
  payments: PortalRentPayment[]
  /** Prepaid rent still due in the future (paid strictly before due date); null once due date arrives */
  earlyPayment: PortalRentPayment | null
  /** Tenant’s monthly payment responsibility (share of unit rent) */
  monthlyRent: number | null
  /** Full monthly rent for the assigned unit/property */
  unitMonthlyRent: number | null
  /** Amount paid toward the current period */
  amountPaid: number
  /** Remaining = tenant share − amount paid (or overdue balance) */
  remainingBalance: number | null
  /** Active tenants assigned to the same unit (for share context) */
  unitOccupantCount: number
}

export { formatUsd }

export type PaymentTenantFocus = 'last' | 'next' | 'remind'

export function paymentTenantAnchorId(clientId: string): string {
  return `payment-tenant-${clientId}`
}

/** Deep-link to Payments with the tenant tile (and optional last/next field) highlighted. */
export function paymentTenantHref(
  clientId: string,
  focus?: PaymentTenantFocus
): string {
  const base = paymentTenantAnchorId(clientId)
  if (!focus) return `/studio/payments#${base}`
  return `/studio/payments#${base}--${focus}`
}

/** Open Payments overdue filter and scroll to the tenant tile (same size as gallery). */
export function paymentTenantRemindHref(clientId: string): string {
  const base = paymentTenantAnchorId(clientId)
  return `/studio/payments?status=overdue#${base}--remind`
}

/** Parse `#payment-tenant-{id}` or `#payment-tenant-{id}--last|next|remind`. */
export function parsePaymentTenantHash(hash: string): {
  anchorId: string
  focus: PaymentTenantFocus | null
} | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.startsWith('payment-tenant-')) return null
  const focusMatch = raw.match(/^(payment-tenant-.+)--(last|next|remind)$/)
  if (focusMatch) {
    return {
      anchorId: focusMatch[1],
      focus: focusMatch[2] as PaymentTenantFocus,
    }
  }
  return { anchorId: raw, focus: null }
}

const COMPLETED_RENT_STATUSES = new Set([
  'paid',
  'paid_early',
  'paid_late',
])

/** Most recent completed rent payment date for Official Tenants / Payments tiles. */
export function getLastPaymentMadeOn(
  payments: PortalRentPayment[],
  client?: Pick<Client, 'invoice' | 'depositPaymentConfirmedAt'>
): string | null {
  const completed = payments.filter((p) => COMPLETED_RENT_STATUSES.has(p.status))
  if (completed.length > 0) {
    const sorted = [...completed].sort((a, b) => {
      const aKey = (a.paidAt ?? a.dueDate).slice(0, 10)
      const bKey = (b.paidAt ?? b.dueDate).slice(0, 10)
      return bKey.localeCompare(aKey)
    })
    const latest = sorted[0]
    return (latest.paidAt ?? latest.dueDate).slice(0, 10)
  }

  const depositPaidAt =
    client?.invoice?.paidAt?.slice(0, 10) ||
    client?.depositPaymentConfirmedAt?.slice(0, 10) ||
    null
  return depositPaidAt
}

/**
 * True when rent was received strictly before its due date (typically the 1st).
 * Payment on the due date is on time — never early.
 */
export function isPaidBeforeDue(
  payment: Pick<PortalRentPayment, 'dueDate' | 'paidAt' | 'status'>
): boolean {
  const paidAt = payment.paidAt?.slice(0, 10)
  const dueDate = payment.dueDate?.slice(0, 10)
  if (paidAt && dueDate) return paidAt < dueDate
  return payment.status === 'paid_early'
}

/**
 * Prepaid early payment only while its due date is still in the future.
 * Once the 1st arrives (or payment was on/after due), treat as on time — not early.
 */
export function isCurrentEarlyPayment(
  payment: PortalRentPayment,
  asOfYmd: string
): boolean {
  if (!isPaidBeforeDue(payment)) return false
  const dueDate = payment.dueDate?.slice(0, 10)
  return Boolean(dueDate && dueDate > asOfYmd)
}

export function toDisplayStatus(
  status: PaymentStatus,
  daysUntilNextDue: number | null,
  earlyPayment: PortalRentPayment | null,
  asOfYmd?: string,
  overduePaymentCount = 0,
  payments: PortalRentPayment[] = [],
  finalDueDate: string | null = null,
  nextDueDate: string | null = null
): PaymentDisplay {
  const situation = resolvePaymentSituation({
    payments,
    nextDueDate,
    daysUntilNextDue,
    finalDueDate,
    overduePaymentCount:
      overduePaymentCount > 0
        ? overduePaymentCount
        : status === 'Overdue' || (daysUntilNextDue != null && daysUntilNextDue < 0)
          ? Math.max(1, overduePaymentCount)
          : 0,
    earlyPayment,
    asOfYmd,
  })
  return situationToDisplay(situation)
}

/**
 * Estimate monthly rent responsibility for a tenant.
 * Prefers Property.monthlyRent (shared with Rentals) ÷ active unit occupants,
 * then custom rentShareAmount, then contract totals as fallback.
 */
export function estimateMonthlyRent(
  client: Client,
  contract?: ContractData,
  properties?: Property[],
  allClients?: Client[],
  getContract?: (clientId: string) => ContractData | undefined
): number | null {
  if (properties && properties.length > 0) {
    const address = getTenantAddress(client, contract)
    const property = findPropertyByAddress(properties, address)
    if (property) {
      const unitRent = resolvePropertyMonthlyRent(property)
      const peers =
        allClients && getContract
          ? allClients.filter((peer) => {
              if (!peer.isOfficialClient) return false
              const peerAddress = getTenantAddress(peer, getContract(peer.id))
              return (
                peerAddress.trim().toLowerCase().replace(/\s+/g, ' ') ===
                address.trim().toLowerCase().replace(/\s+/g, ' ')
              )
            })
          : [client]
      const activeCount = Math.max(1, peers.length)
      const share = tenantMonthlyShare({
        unitMonthlyRent: unitRent,
        activeTenantCount: activeCount,
        customShareAmount: client.rentShareAmount,
      })
      if (share != null) return share
    }
  }

  const custom = Number(client.rentShareAmount)
  if (Number.isFinite(custom) && custom > 0) return Math.round(custom * 100) / 100

  if (!contract) return null
  const total = parseMoney(contract.totalCost)
  const months = client.leaseLengthMonths
  if (total && months && months > 0) {
    return Math.round(total / months)
  }
  const deposit = parseMoney(contract.depositAmount)
  if (deposit) return deposit
  return getRemainingBalanceAmount(contract)
}

/**
 * Overdue balance = past-due obligations − amounts applied to them.
 * Never includes future rent or the full remaining lease value.
 */
export function computeOverdueAmount(
  overduePaymentCount: number,
  client: Client,
  contract?: ContractData,
  properties?: Property[],
  allClients?: Client[],
  getContract?: (clientId: string) => ContractData | undefined
): number | null {
  if (overduePaymentCount <= 0) return null
  const monthly = estimateMonthlyRent(
    client,
    contract,
    properties,
    allClients,
    getContract
  )
  if (monthly != null) {
    const gross = Math.round(monthly * overduePaymentCount * 100) / 100
    const applied = Number(client.currentPeriodAmountPaid)
    const paidToward = Number.isFinite(applied) && applied > 0 ? applied : 0
    return Math.round(Math.max(0, gross - paidToward) * 100) / 100
  }
  return getRemainingBalanceAmount(contract)
}

function pickEarlyPayment(
  payments: PortalRentPayment[],
  asOfYmd: string
): PortalRentPayment | null {
  const early = payments.filter((p) => isCurrentEarlyPayment(p, asOfYmd))
  if (early.length === 0) return null
  return [...early].sort((a, b) =>
    (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate)
  )[0]
}

function currentAsOfYmd(): string {
  if (typeof window !== 'undefined' && isPublicDemoSession()) {
    return getDemoAsOfYmd()
  }
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function buildTenantPaymentRows(
  clients: Client[],
  contracts: ContractData[],
  properties: Property[] = []
): TenantPaymentRow[] {
  const asOfYmd = currentAsOfYmd()
  const getContract = (clientId: string) =>
    contracts.find((c) => c.clientId === clientId)

  return clients
    .map((client) => {
      const contract = getContract(client.id)
      const schedule = getLeaseRentSchedule(client, contract)
      const earlyPayment = pickEarlyPayment(schedule.payments, asOfYmd)
      const overduePaymentCount = schedule.overduePaymentCount

      const overdueAmount =
        overduePaymentCount > 0
          ? computeOverdueAmount(
              overduePaymentCount,
              client,
              contract,
              properties,
              clients,
              getContract
            )
          : null

      const situation = resolvePaymentSituation({
        payments: schedule.payments,
        nextDueDate: schedule.nextDueDate,
        daysUntilNextDue: schedule.daysUntilNextDue,
        finalDueDate: schedule.finalDueDate,
        overduePaymentCount,
        remainingBalance: overdueAmount,
        amountPaidTowardPeriod: Number(client.currentPeriodAmountPaid) || 0,
        earlyPayment,
        asOfYmd,
      })
      const display = situationToDisplay(situation)

      const responsibility = resolveTenantRentResponsibility(
        client,
        contract,
        properties,
        clients,
        getContract,
        {
          periodFullyPaid: display === 'Paid' || display === 'Paid Early',
          overdueAmount,
        }
      )

      const monthlyRent =
        responsibility.tenantShare ??
        estimateMonthlyRent(client, contract, properties, clients, getContract)

      const presentation = buildPaymentStatusPresentation({
        client,
        payments: schedule.payments,
        nextDueDate: schedule.nextDueDate,
        daysUntilNextDue: schedule.daysUntilNextDue,
        finalDueDate: schedule.finalDueDate,
        overduePaymentCount,
        remainingBalance: responsibility.remainingBalance ?? overdueAmount,
        amountPaidTowardPeriod: responsibility.amountPaidTowardPeriod,
        earlyPayment,
        asOfYmd,
      })

      const finalPaid =
        schedule.finalDueDate != null &&
        schedule.payments.some(
          (p) =>
            p.dueDate.slice(0, 10) === schedule.finalDueDate &&
            COMPLETED_RENT_STATUSES.has(p.status)
        )

      return {
        client,
        contract,
        address: getTenantAddress(client, contract),
        unitLabel: responsibility.unitLabel,
        display,
        situation: presentation.situation,
        statusLabel: presentation.statusLabel,
        presentation,
        paymentStatus: client.paymentStatus,
        lastPaymentMadeOn: getLastPaymentMadeOn(schedule.payments, client),
        nextDueDate: schedule.nextDueDate,
        daysUntilNextDue: schedule.daysUntilNextDue,
        finalDueDate: schedule.finalDueDate,
        outstandingFinalDueDate:
          schedule.finalDueDate && !finalPaid ? schedule.finalDueDate : null,
        leaseEndDate: schedule.leaseEndDate,
        leaseStartDate: schedule.leaseStartDate,
        leaseLengthMonths: schedule.leaseLengthMonths,
        overduePaymentCount,
        overdueAmount,
        payments: schedule.payments,
        earlyPayment,
        monthlyRent,
        unitMonthlyRent: responsibility.unitMonthlyRent,
        amountPaid: responsibility.amountPaidTowardPeriod,
        remainingBalance: responsibility.remainingBalance,
        unitOccupantCount: responsibility.activeTenantCount,
      }
    })
    .sort((a, b) => {
      const addr = a.address.localeCompare(b.address)
      if (addr !== 0) return addr
      return a.client.name.localeCompare(b.client.name)
    })
}

export function groupPaymentRowsByAddress(
  rows: TenantPaymentRow[]
): { address: string; tenants: TenantPaymentRow[] }[] {
  const map = new Map<string, TenantPaymentRow[]>()
  for (const row of rows) {
    const list = map.get(row.address) ?? []
    list.push(row)
    map.set(row.address, list)
  }
  return Array.from(map.entries()).map(([address, tenants]) => ({ address, tenants }))
}

export function getOverduePaymentRows(rows: TenantPaymentRow[]): TenantPaymentRow[] {
  return rows
    .filter((row) => row.display === 'Overdue')
    .sort((a, b) => {
      const aDays = a.daysUntilNextDue ?? 0
      const bDays = b.daysUntilNextDue ?? 0
      if (aDays !== bDays) return aDays - bDays
      return a.client.name.localeCompare(b.client.name)
    })
}

export function summarizePaymentRows(rows: TenantPaymentRow[]): {
  paid: number
  due: number
  overdueCount: number
  overdueTotal: number
} {
  const overdueRows = rows.filter((r) => r.display === 'Overdue')
  return {
    paid: rows.filter((r) => r.display === 'Paid' || r.display === 'Paid Early').length,
    due: rows.filter((r) => r.display !== 'Paid' && r.display !== 'Paid Early').length,
    overdueCount: overdueRows.length,
    overdueTotal: overdueRows.reduce(
      (sum, r) => sum + (r.remainingBalance ?? r.overdueAmount ?? 0),
      0
    ),
  }
}

export function displayBadgeLabel(display: PaymentDisplay, statusLabel?: string): string {
  if (statusLabel) return statusLabel
  if (display === 'Paid') return 'Current'
  if (display === 'Paid Early') return 'Paid Early'
  if (display === 'Overdue') return 'Overdue'
  return 'Due'
}

export function displayBadgeStatus(
  display: PaymentDisplay,
  situation?: PaymentSituation
): PaymentStatus {
  if (situation === 'partially_paid') return 'Partial'
  if (situation === 'due_soon' || situation === 'final_payment_due') return 'Deposit Paid'
  if (display === 'Paid' || display === 'Paid Early') return 'Paid'
  if (display === 'Overdue') return 'Overdue'
  return 'Unpaid'
}

export { situationStatusLabel }
