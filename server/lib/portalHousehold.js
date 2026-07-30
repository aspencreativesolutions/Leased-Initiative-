/**
 * Household / property-details payload for the tenant portal dashboard.
 */
import {
  computeLeaseStartDate,
  formatYmd,
  getLeaseRentSchedule,
  isFutureLeaseStartDate,
  monthsBetweenLeaseDates,
  parseYmd,
  resolveTenantAddress,
} from './leaseSchedule.js'
import { hasEntireHomeTenant } from './furnishedOccupancy.js'
import {
  addressesMatch,
  availableApplicantSlotsAtAddress,
  findPropertyByAddress,
} from './rentalOccupancy.js'
import { ensurePropertyBedLayout } from './rentalBeds.js'
import { resolvePropertyMonthlyRent, tenantMonthlyShare } from './rentalRent.js'
import { estimateMonthlyRent } from './rentPayments.js'
import { resolveServerScheduleAsOf } from './scheduleAsOf.js'

function normalizeAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getTenantAddress(client, contract) {
  return resolveTenantAddress(client, contract) || String(client?.projectName ?? '').trim()
}

function officialHouseholdAtAddress(store, address) {
  const key = normalizeAddress(address)
  if (!key) return []
  return (store.clients ?? []).filter((peer) => {
    if (!peer?.isOfficialClient) return false
    const peerContract = (store.contracts ?? []).find((c) => c.clientId === peer.id)
    return normalizeAddress(getTenantAddress(peer, peerContract)) === key
  })
}

/** Assign occupants into bedrooms (vacant rooms first) — mirrors client roster logic. */
function countVacantBedrooms(property, tenants) {
  if (!property) return 0
  const ensured = ensurePropertyBedLayout(property)
  const layout = ensured.bedroomsLayout ?? []
  if (!layout.length) return 0

  const rooms = layout.map((bedroom) => ({
    id: bedroom.id,
    occupants: [],
  }))
  const byId = new Map(rooms.map((room) => [room.id, room]))
  const unassigned = []

  for (const tenant of tenants) {
    const roomId = tenant.bedroomId?.trim()
    const room = roomId ? byId.get(roomId) : undefined
    if (room) room.occupants.push(tenant)
    else unassigned.push(tenant)
  }

  unassigned.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  for (const tenant of unassigned) {
    const empty = rooms.find((room) => room.occupants.length === 0)
    if (empty) {
      empty.occupants.push(tenant)
      continue
    }
    const target = [...rooms].sort((a, b) => a.occupants.length - b.occupants.length)[0]
    target?.occupants.push(tenant)
  }

  return rooms.filter((room) => room.occupants.length === 0).length
}

function paymentStatusForRoommate(client, contract) {
  const schedule = getLeaseRentSchedule(client, contract)
  const paidToward = Number(client?.currentPeriodAmountPaid)
  const hasPartial = Number.isFinite(paidToward) && paidToward > 0

  if ((schedule.overduePaymentCount ?? 0) > 0) {
    if (hasPartial) {
      return { label: 'Partially Paid', tone: 'warning' }
    }
    return { label: 'Overdue', tone: 'error' }
  }

  const duePayment = (schedule.payments ?? []).find((p) => p.status === 'due')
  if (duePayment) {
    if (hasPartial) return { label: 'Partially Paid', tone: 'warning' }
    return { label: 'Due', tone: 'warning' }
  }

  if (
    schedule.daysUntilNextDue != null &&
    schedule.daysUntilNextDue >= 0 &&
    schedule.daysUntilNextDue <= 7
  ) {
    return { label: 'Due Soon', tone: 'warning' }
  }

  const unpaid = (schedule.payments ?? []).filter(
    (p) => p.status === 'overdue' || p.status === 'due' || p.status === 'upcoming'
  )
  if (unpaid.length === 0 && (schedule.payments ?? []).length > 0) {
    return { label: 'Paid in Full', tone: 'positive' }
  }

  return { label: 'Current', tone: 'positive' }
}

function nextMonthStartYmd(asOf) {
  const next = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 1)
  return formatYmd(next.getFullYear(), next.getMonth(), next.getDate())
}

/** Next seasonal Jan 1 / Aug 1 that is strictly after asOf. */
function nextFutureLeaseCycleStartYmd(asOf) {
  let candidate = computeLeaseStartDate(asOf)
  if (isFutureLeaseStartDate(candidate, asOf)) return candidate
  const d = parseYmd(candidate)
  if (d.getMonth() === 0) {
    return formatYmd(d.getFullYear(), 7, 1)
  }
  return formatYmd(d.getFullYear() + 1, 0, 1)
}

function buildStartOption(id, label, startDate, leaseEndDate, asOf) {
  if (!startDate || !leaseEndDate) {
    return { id, label, startDate: null, leaseEndDate, available: false, leaseLengthMonths: null }
  }
  const start = startDate.slice(0, 10)
  const end = leaseEndDate.slice(0, 10)
  const available =
    isFutureLeaseStartDate(start, asOf) && start < end
  const leaseLengthMonths = available ? monthsBetweenLeaseDates(start, end) : null
  return {
    id,
    label,
    startDate: start,
    leaseEndDate: end,
    available,
    leaseLengthMonths,
  }
}

/**
 * @returns {object | null}
 */
export function buildPortalHousehold(store, client, contract) {
  if (!client) return null

  const address = getTenantAddress(client, contract)
  if (!address) return null

  const household = officialHouseholdAtAddress(store, address)
  if (household.length === 0) {
    household.push(client)
  }

  const property = findPropertyByAddress(store, address)
  const capacity = availableApplicantSlotsAtAddress(store, address)
  const unitMonthlyRent = property ? resolvePropertyMonthlyRent(property) : null
  const occupantCount = household.length
  const vacantBedroomCount = countVacantBedrooms(property, household)
  const entireHomeOnly = property?.entireHomeOnly === true
  const reservedEntireHome = hasEntireHomeTenant(store, address, addressesMatch)
  const availableSpots = Math.max(0, Number(capacity?.slots) || 0)

  const hasExtraBedroom =
    !entireHomeOnly &&
    !reservedEntireHome &&
    vacantBedroomCount > 0 &&
    availableSpots > 0

  const currentShareAmount = estimateMonthlyRent(client, contract, store)
  const reducedShareAmount =
    unitMonthlyRent != null && Number.isFinite(unitMonthlyRent) && unitMonthlyRent > 0
      ? tenantMonthlyShare({
          unitMonthlyRent,
          activeTenantCount: occupantCount + 1,
        })
      : null

  const schedule = getLeaseRentSchedule(client, contract)
  const leaseEndDate = schedule.leaseEndDate
  const asOf = resolveServerScheduleAsOf()

  const startOptions = [
    buildStartOption(
      'next_month',
      'Start next month',
      nextMonthStartYmd(asOf),
      leaseEndDate,
      asOf
    ),
    buildStartOption(
      'next_lease_cycle',
      'Start next lease cycle',
      nextFutureLeaseCycleStartYmd(asOf),
      leaseEndDate,
      asOf
    ),
  ]

  const roommates = household
    .slice()
    .sort((a, b) => {
      if (a.id === client.id) return -1
      if (b.id === client.id) return 1
      return String(a.name).localeCompare(String(b.name))
    })
    .map((peer) => {
      const peerContract =
        (store.contracts ?? []).find((c) => c.clientId === peer.id) ?? contract
      const status = paymentStatusForRoommate(peer, peerContract)
      return {
        id: peer.id,
        name: peer.name,
        isYou: peer.id === client.id,
        paymentStatusLabel: status.label,
        paymentStatusTone: status.tone,
      }
    })

  return {
    address,
    totalRoommates: occupantCount,
    roommates,
    vacantBedroomCount,
    hasExtraBedroom,
    unitMonthlyRent,
    currentShareAmount,
    reducedShareAmount,
    leaseStartDate: schedule.leaseStartDate,
    leaseEndDate,
    startOptions,
    canInvite: hasExtraBedroom && startOptions.some((opt) => opt.available),
  }
}
