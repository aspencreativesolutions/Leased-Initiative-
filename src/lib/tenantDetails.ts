import {
  getLeaseStatusDetails,
  getTenantAddress,
  parseMoney,
  shouldShowInOfficialTenants,
} from '@/lib/clientUtils'
import { formatLeaseLengthLabel, parseYmd } from '@/lib/leaseSchedule'
import {
  paymentProviderLabel,
  resolveLastTransactionPaymentProvider,
} from '@/lib/paymentProvider'
import {
  buildTenantPaymentRows,
  getLastPaymentMadeOn,
  type TenantPaymentRow,
} from '@/lib/paymentTenantRows'
import { addressesMatch, findPropertyByAddress } from '@/lib/properties'
import { extractUnitLabel, formatUsd } from '@/lib/rentalRent'
import { formatLongDate, formatMonthDay } from '@/lib/utils'
import type {
  Client,
  ContractData,
  LeaseRenewalStatus,
  OccupancyArrangement,
  PortalRentPayment,
  Property,
} from '@/types'

export const OCCUPANCY_ARRANGEMENT_LABELS: Record<OccupancyArrangement, string> = {
  entire_home: 'Entire home',
  private_unit: 'Private unit',
  shared_home: 'Shared home',
  shared_apartment: 'Shared apartment',
  room_rental: 'Room rental',
}

export const LEASE_RENEWAL_STATUS_LABELS: Record<LeaseRenewalStatus, string> = {
  renewal_offered: 'Renewal offered',
  re_sign_pending: 'Re-sign pending',
  not_renewing: 'Not renewing',
}

export interface TenantRoommateSummary {
  id: string
  name: string
  unitOrRoomLabel: string | null
  leaseStatus: string
  sharesLease: boolean
}

export interface LatePaymentRecord {
  dueDate: string
  paidAt: string
  daysLate: number
  amount: number
  paymentMethod: string
}

export interface TenantDetailsProfile {
  client: Client
  contract?: ContractData
  property?: Property
  fullName: string
  email: string
  phone: string | null
  accountCreatedAt: string
  officialSince: string | null
  preferredPaymentMethod: string
  tenantStatus: string
  propertyAddress: string
  unitNumber: string | null
  rentalType: string | null
  monthlyRent: number | null
  securityDeposit: number | null
  sharesProperty: boolean
  occupancyArrangement: OccupancyArrangement
  occupancyArrangementLabel: string
  /** Concise count of official tenants on this property, e.g. "1 of 2 tenants on this property". */
  propertyOccupancyStatement: string
  officialTenantsOnProperty: number
  roommates: TenantRoommateSummary[]
  livesAlone: boolean
  leaseStartDate: string | null
  leaseEndDate: string | null
  leaseDurationLabel: string | null
  leaseSignedAt: string | null
  leaseStatus: string
  leaseTimelineState?: string
  leaseBeganLabel: string | null
  scheduledStartLabel: string | null
  daysRemaining: number | null
  renewalStatusLabel: string | null
  paymentProcessor: string
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
  nextPaymentDate: string | null
  nextPaymentAmount: number | null
  paymentStatusLabel: string
  paymentsMadeCount: number
  latePaymentsCount: number
  outstandingBalance: number | null
  latePayments: LatePaymentRecord[]
  sharesLeaseWithRoommates: boolean
  separateLeaseFromRoommates: boolean
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const from = parseYmd(fromYmd.slice(0, 10))
  const to = parseYmd(toYmd.slice(0, 10))
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

export function getTenantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function resolveOccupancyArrangement(
  client: Client,
  property: Property | undefined,
  roommateCount: number
): OccupancyArrangement {
  if (client.occupancyArrangement) return client.occupancyArrangement

  const type = property?.propertyType ?? ''
  const isApartmentLike =
    type === 'Apartment' ||
    type === 'Studio Apartment' ||
    type === 'Condominium (Condo)' ||
    type === 'Loft'

  if (roommateCount === 0) {
    if (isApartmentLike || type === 'Duplex' || type === 'Townhouse') return 'private_unit'
    return 'entire_home'
  }

  if (isApartmentLike) return 'shared_apartment'
  return 'shared_home'
}

/** Official tenants at the same property address, excluding the subject. */
export function getRoommateClients(
  client: Client,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Client[] {
  const contract = getContract(client.id)
  const address = getTenantAddress(client, contract)
  if (!address || address === '—') return []

  return clients.filter((peer) => {
    if (peer.id === client.id) return false
    if (!shouldShowInOfficialTenants(peer, getContract(peer.id))) return false
    return addressesMatch(getTenantAddress(peer, getContract(peer.id)), address)
  })
}

/**
 * Occupancy copy for Property and Rental Details.
 * `totalOfficialTenants` is the selected tenant plus current official peers on the same property/unit.
 */
export function formatPropertyOccupancyStatement(totalOfficialTenants: number): string {
  const total = Math.max(1, Math.floor(totalOfficialTenants))
  if (total === 1) return 'Only tenant on this property'
  return `1 of ${total} tenants on this property`
}

function resolveTenantStatus(client: Client, leaseState?: string): string {
  if (!client.isOfficialClient) {
    if (client.contractStatus === 'Sent') return 'Pending — lease sent'
    return 'Pending'
  }
  if (leaseState === 'Upcoming') return 'Official — lease upcoming'
  if (leaseState === 'Ending Soon') return 'Official — ending soon'
  if (leaseState === 'Expired') return 'Former tenant'
  return 'Official tenant'
}

function buildLeaseBeganLabel(
  startDate: string | null,
  endDate: string | null,
  state?: string
): string | null {
  if (!startDate) return null
  if (state === 'Upcoming') return `Lease begins ${formatMonthDay(startDate)}`
  if (state === 'Expired' && endDate) return `Lease ended ${formatMonthDay(endDate)}`
  if (state === 'Active' || state === 'Ending Soon') {
    return `Lease began ${formatMonthDay(startDate)}`
  }
  return `Lease start ${formatMonthDay(startDate)}`
}

function latePaymentsFromSchedule(
  payments: PortalRentPayment[],
  monthlyRent: number | null,
  paymentMethod: string
): LatePaymentRecord[] {
  const amount = monthlyRent ?? 0
  return payments
    .filter((p) => p.status === 'paid_late' && p.paidAt)
    .map((p) => {
      const paidAt = p.paidAt!.slice(0, 10)
      const dueDate = p.dueDate.slice(0, 10)
      return {
        dueDate,
        paidAt,
        daysLate: Math.max(1, daysBetween(dueDate, paidAt)),
        amount,
        paymentMethod,
      }
    })
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
}

function paymentRowForClient(
  clientId: string,
  clients: Client[],
  contracts: ContractData[],
  properties: Property[]
): TenantPaymentRow | undefined {
  return buildTenantPaymentRows(clients, contracts, properties).find(
    (row) => row.client.id === clientId
  )
}

export function buildTenantDetailsProfile(
  clientId: string,
  clients: Client[],
  properties: Property[],
  getContract: (clientId: string) => ContractData | undefined
): TenantDetailsProfile | null {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return null

  const contract = getContract(client.id)
  const address = getTenantAddress(client, contract)
  const property = findPropertyByAddress(properties, address)
  const roommates = getRoommateClients(client, clients, getContract)
  const officialTenantsOnProperty = roommates.length + 1
  const lease = getLeaseStatusDetails(client, contract)
  const contracts = clients
    .map((c) => getContract(c.id))
    .filter((c): c is ContractData => Boolean(c))
  const paymentRow = paymentRowForClient(client.id, clients, contracts, properties)
  const monthlyRent = paymentRow?.monthlyRent ?? null
  const provider = resolveLastTransactionPaymentProvider(client, contract)
  const processorLabel = paymentProviderLabel(provider)
  const preferredMethod = processorLabel
  const occupancy = resolveOccupancyArrangement(client, property, roommates.length)
  const unitFromAddress = extractUnitLabel(address)
  const unitNumber = client.unitOrRoomLabel?.trim() || unitFromAddress
  const securityDeposit = parseMoney(contract?.depositAmount)
  const sharesLeaseWithRoommates = Boolean(
    client.leaseGroupId &&
      roommates.some((r) => r.leaseGroupId === client.leaseGroupId)
  )
  const separateLeaseFromRoommates =
    roommates.length > 0 &&
    Boolean(client.leaseGroupId) &&
    roommates.every(
      (r) => r.leaseGroupId && r.leaseGroupId !== client.leaseGroupId
    )

  const payments = paymentRow?.payments ?? []
  const completed = payments.filter((p) =>
    p.status === 'paid' || p.status === 'paid_early' || p.status === 'paid_late'
  )
  const latePayments = latePaymentsFromSchedule(payments, monthlyRent, processorLabel)
  const lastPaymentDate =
    paymentRow?.lastPaymentMadeOn ?? getLastPaymentMadeOn(payments, client)
  const lastCompleted = [...completed].sort((a, b) =>
    (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate)
  )[0]
  const nextUnpaid = payments.find(
    (p) => p.status === 'due' || p.status === 'overdue' || p.status === 'upcoming'
  )

  const renewalStatusLabel =
    client.leaseRenewalStatus
      ? LEASE_RENEWAL_STATUS_LABELS[client.leaseRenewalStatus]
      : lease.state === 'Ending Soon'
        ? 'Renewal window open'
        : null

  return {
    client,
    contract,
    property,
    fullName: client.name,
    email: client.email,
    phone: client.phone?.trim() || null,
    accountCreatedAt: client.createdAt,
    officialSince: client.officialClientSince ?? null,
    preferredPaymentMethod: preferredMethod,
    tenantStatus: resolveTenantStatus(client, lease.state),
    propertyAddress: address,
    unitNumber,
    rentalType: property?.propertyType ?? null,
    monthlyRent,
    securityDeposit,
    sharesProperty: roommates.length > 0,
    occupancyArrangement: occupancy,
    occupancyArrangementLabel: OCCUPANCY_ARRANGEMENT_LABELS[occupancy],
    propertyOccupancyStatement: formatPropertyOccupancyStatement(officialTenantsOnProperty),
    officialTenantsOnProperty,
    roommates: roommates.map((peer) => {
      const peerLease = getLeaseStatusDetails(peer, getContract(peer.id))
      const peerAddress = getTenantAddress(peer, getContract(peer.id))
      return {
        id: peer.id,
        name: peer.name,
        unitOrRoomLabel:
          peer.unitOrRoomLabel?.trim() || extractUnitLabel(peerAddress),
        leaseStatus: peerLease.status,
        sharesLease: Boolean(
          client.leaseGroupId && peer.leaseGroupId === client.leaseGroupId
        ),
      }
    }),
    livesAlone: roommates.length === 0,
    leaseStartDate: lease.startDate ?? null,
    leaseEndDate: lease.endDate ?? null,
    leaseDurationLabel: lease.termMonths
      ? formatLeaseLengthLabel(lease.termMonths)
      : null,
    leaseSignedAt: contract?.signedAt ?? contract?.clientSignDate ?? null,
    leaseStatus: lease.status,
    leaseTimelineState: lease.state,
    leaseBeganLabel: buildLeaseBeganLabel(lease.startDate ?? null, lease.endDate ?? null, lease.state),
    scheduledStartLabel:
      lease.state === 'Upcoming' && lease.startDate
        ? `Scheduled start ${formatLongDate(lease.startDate)}`
        : null,
    daysRemaining:
      lease.state === 'Upcoming'
        ? lease.daysUntilStart ?? null
        : lease.daysRemaining ?? null,
    renewalStatusLabel,
    paymentProcessor: processorLabel,
    lastPaymentDate,
    lastPaymentAmount: lastCompleted ? monthlyRent : null,
    nextPaymentDate: paymentRow?.nextDueDate ?? nextUnpaid?.dueDate ?? null,
    nextPaymentAmount: nextUnpaid || paymentRow?.nextDueDate ? monthlyRent : null,
    paymentStatusLabel: paymentRow?.statusLabel ?? client.paymentStatus,
    paymentsMadeCount: completed.length,
    latePaymentsCount: latePayments.length,
    outstandingBalance:
      paymentRow?.remainingBalance && paymentRow.remainingBalance > 0
        ? paymentRow.remainingBalance
        : paymentRow?.overdueAmount && paymentRow.overdueAmount > 0
          ? paymentRow.overdueAmount
          : null,
    latePayments,
    sharesLeaseWithRoommates,
    separateLeaseFromRoommates,
  }
}

export { formatUsd, formatLongDate, formatMonthDay }
