import {
  getRemainingBalanceAmount,
  getTenantAddress,
  parseMoney,
} from '@/lib/clientUtils'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import type { Client, ContractData, PaymentStatus } from '@/types'

export type PaymentDisplay = 'Paid' | 'Due' | 'Overdue'

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
  leaseLengthMonths: number | null
  overduePaymentCount: number
  overdueAmount: number | null
}

export function paymentTenantAnchorId(clientId: string): string {
  return `payment-tenant-${clientId}`
}

export function paymentTenantHref(clientId: string): string {
  return `/studio/payments#${paymentTenantAnchorId(clientId)}`
}

export function toDisplayStatus(
  status: PaymentStatus,
  daysUntilNextDue: number | null
): PaymentDisplay {
  if (status === 'Paid') return 'Paid'
  if (status === 'Overdue' || (daysUntilNextDue != null && daysUntilNextDue < 0)) {
    return 'Overdue'
  }
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

export function buildTenantPaymentRows(
  clients: Client[],
  contracts: ContractData[]
): TenantPaymentRow[] {
  return clients
    .map((client) => {
      const contract = contracts.find((c) => c.clientId === client.id)
      const schedule = getLeaseRentSchedule(client, contract)
      const display = toDisplayStatus(client.paymentStatus, schedule.daysUntilNextDue)
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
        leaseLengthMonths: schedule.leaseLengthMonths,
        overduePaymentCount,
        overdueAmount:
          display === 'Overdue'
            ? computeOverdueAmount(overduePaymentCount, client, contract)
            : null,
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
  if (display === 'Overdue') return 'Overdue'
  return 'Due'
}

export function displayBadgeStatus(display: PaymentDisplay): PaymentStatus {
  if (display === 'Paid') return 'Paid'
  if (display === 'Overdue') return 'Overdue'
  return 'Unpaid'
}
