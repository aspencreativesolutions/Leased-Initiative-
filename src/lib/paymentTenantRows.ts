import {
  getRemainingBalanceAmount,
  getTenantAddress,
  parseMoney,
} from '@/lib/clientUtils'
import { getDemoAsOfYmd } from '@/lib/demoClock'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import { isPublicDemoSession } from '@/lib/publicDemo'
import type { Client, ContractData, PaymentStatus, PortalRentPayment } from '@/types'

export type PaymentDisplay = 'Paid' | 'Due' | 'Overdue' | 'Paid Early'

export interface TenantPaymentRow {
  client: Client
  contract?: ContractData
  address: string
  display: PaymentDisplay
  paymentStatus: PaymentStatus
  nextDueDate: string | null
  daysUntilNextDue: number | null
  finalDueDate: string | null
  leaseEndDate: string | null
  leaseStartDate: string | null
  leaseLengthMonths: number | null
  overduePaymentCount: number
  overdueAmount: number | null
  /** Shared month-by-month schedule (same source as Tenant Portal) */
  payments: PortalRentPayment[]
  /** Most recent early payment, if any */
  earlyPayment: PortalRentPayment | null
  monthlyRent: number | null
}

export function paymentTenantAnchorId(clientId: string): string {
  return `payment-tenant-${clientId}`
}

export function paymentTenantHref(clientId: string): string {
  return `/studio/payments#${paymentTenantAnchorId(clientId)}`
}

export function toDisplayStatus(
  status: PaymentStatus,
  daysUntilNextDue: number | null,
  earlyPayment: PortalRentPayment | null,
  asOfYmd?: string
): PaymentDisplay {
  if (status === 'Overdue' || (daysUntilNextDue != null && daysUntilNextDue < 0)) {
    return 'Overdue'
  }
  // Highlight prepaid rent for a month that has not started yet
  if (earlyPayment?.dueDate && asOfYmd && earlyPayment.dueDate > asOfYmd) {
    return 'Paid Early'
  }
  if (status === 'Paid') return 'Paid'
  return 'Due'
}

/** Estimate monthly rent from contract totals or remaining balance. */
export function estimateMonthlyRent(
  client: Client,
  contract?: ContractData
): number | null {
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

export function computeOverdueAmount(
  overduePaymentCount: number,
  client: Client,
  contract?: ContractData
): number | null {
  if (overduePaymentCount <= 0) return null
  const monthly = estimateMonthlyRent(client, contract)
  if (monthly != null) {
    return Math.round(monthly * overduePaymentCount * 100) / 100
  }
  return getRemainingBalanceAmount(contract)
}

function pickEarlyPayment(payments: PortalRentPayment[]): PortalRentPayment | null {
  const early = payments.filter((p) => p.status === 'paid_early')
  if (early.length === 0) return null
  return [...early].sort((a, b) => (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate))[0]
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
  contracts: ContractData[]
): TenantPaymentRow[] {
  const asOfYmd = currentAsOfYmd()
  return clients
    .map((client) => {
      const contract = contracts.find((c) => c.clientId === client.id)
      const schedule = getLeaseRentSchedule(client, contract)
      const earlyPayment = pickEarlyPayment(schedule.payments)
      const display = toDisplayStatus(
        client.paymentStatus,
        schedule.daysUntilNextDue,
        earlyPayment,
        asOfYmd
      )
      const overduePaymentCount =
        display === 'Overdue'
          ? Math.max(1, schedule.overduePaymentCount)
          : schedule.overduePaymentCount
      return {
        client,
        contract,
        address: getTenantAddress(client, contract),
        display,
        paymentStatus: client.paymentStatus,
        nextDueDate: schedule.nextDueDate,
        daysUntilNextDue: schedule.daysUntilNextDue,
        finalDueDate: schedule.finalDueDate,
        leaseEndDate: schedule.leaseEndDate,
        leaseStartDate: schedule.leaseStartDate,
        leaseLengthMonths: schedule.leaseLengthMonths,
        overduePaymentCount,
        overdueAmount:
          display === 'Overdue'
            ? computeOverdueAmount(overduePaymentCount, client, contract)
            : null,
        payments: schedule.payments,
        earlyPayment,
        monthlyRent: estimateMonthlyRent(client, contract),
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

export function displayBadgeLabel(display: PaymentDisplay): string {
  if (display === 'Paid') return 'Paid'
  if (display === 'Paid Early') return 'Paid Early'
  if (display === 'Overdue') return 'Overdue'
  return 'Due'
}

export function displayBadgeStatus(display: PaymentDisplay): PaymentStatus {
  if (display === 'Paid' || display === 'Paid Early') return 'Paid'
  if (display === 'Overdue') return 'Overdue'
  return 'Unpaid'
}
