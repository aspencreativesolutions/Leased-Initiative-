/**
 * Occupancy preference labels + placement messaging (mirrors src/lib/furnishedOccupancy.ts).
 */
import {
  bedCapacityForSize,
  ensurePropertyBedLayout,
  isBedSize,
  maxOccupancyFromLayout,
} from './rentalBeds.js'
import { occupantHeadcount } from './applicantParty.js'

export function normalizeOccupancyMode(mode) {
  if (!mode) return null
  const raw = String(mode).trim().toLowerCase()
  if (raw === 'full_rent' || raw === 'entire_home') return 'entire_home'
  if (raw === 'roommates' || raw === 'open_to_roommates') return 'open_to_roommates'
  if (raw === 'private_room') return 'private_room'
  if (raw === 'shared_room') return 'shared_room'
  return null
}

export function resolveBedroomPrivacy(room) {
  if (room?.privacy === 'private' || room?.privacy === 'shared') return room.privacy
  const beds = room?.beds ?? []
  if (beds.length > 1) return 'shared'
  if (beds.some((b) => (b.capacity ?? bedCapacityForSize(b.size)) > 1)) return 'shared'
  return 'private'
}

function resolveBedMonthlyRent(property, bed) {
  const custom = Number(bed?.monthlyRent)
  if (Number.isFinite(custom) && custom > 0) return Math.round(custom * 100) / 100
  const unit = Number(property.monthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null
  let bedCount = 0
  for (const room of property.bedroomsLayout ?? []) {
    bedCount += (room.beds ?? []).length
  }
  bedCount = Math.max(1, bedCount)
  return Math.round((unit / bedCount) * 100) / 100
}

function roomMonthlyRent(property, bedroom) {
  const unit = Number(property.monthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null
  const rooms = Math.max(1, (property.bedroomsLayout ?? []).length)
  return Math.round((unit / rooms) * 100) / 100
}

function personMonthlyRent(property) {
  const unit = Number(property.monthlyRent)
  const max = Math.max(1, Number(property.maxTenants) || 1)
  if (!Number.isFinite(unit) || unit <= 0) return null
  return Math.round((unit / max) * 100) / 100
}

/**
 * Official tenants that close the rental to additional applicants
 * (entire-home arrangement or preference).
 */
export function hasEntireHomeTenant(store, address, addressesMatch) {
  return (store.clients ?? []).some((client) => {
    if (!client?.isOfficialClient) return false
    if (!addressesMatch(client.projectName, address)) return false
    if (client.occupancyArrangement === 'entire_home') return true
    const mode = normalizeOccupancyMode(client.preferredOccupancyMode)
    return mode === 'entire_home'
  })
}

export function buildFurnishedPlacementInventory(property, occupants) {
  const ensured = ensurePropertyBedLayout(property)
  const pricingStructure =
    ensured.pricingStructure ?? (ensured.furnished ? 'bed' : 'person')
  const entireHomeOnly = ensured.entireHomeOnly === true
  const totalRent =
    Number.isFinite(Number(ensured.monthlyRent)) && Number(ensured.monthlyRent) > 0
      ? Math.round(Number(ensured.monthlyRent))
      : null

  const assignedByBed = new Map()
  const assignedByRoom = new Map()
  for (const occupant of occupants ?? []) {
    if (occupant.bedId) {
      const list = assignedByBed.get(occupant.bedId) ?? []
      list.push(occupant)
      assignedByBed.set(occupant.bedId, list)
    }
    if (occupant.bedroomId) {
      const list = assignedByRoom.get(occupant.bedroomId) ?? []
      list.push(occupant)
      assignedByRoom.set(occupant.bedroomId, list)
    }
  }

  const bedrooms = []
  const placements = []

  for (const bedroom of ensured.bedroomsLayout ?? []) {
    const privacy = resolveBedroomPrivacy(bedroom)
    const roomPlacements = []

    if (pricingStructure === 'room') {
      const assigned = assignedByRoom.get(bedroom.id) ?? []
      const roomCap = Math.max(
        1,
        (bedroom.beds ?? []).reduce(
          (sum, b) => sum + (b.capacity ?? bedCapacityForSize(isBedSize(b.size) ? b.size : 'queen')),
          0
        )
      )
      const occupied = assigned.length > 0
      const placement = {
        id: `room:${bedroom.id}`,
        kind: 'room',
        bedroomId: bedroom.id,
        bedroomLabel: bedroom.label,
        capacity: roomCap >= 2 ? 2 : 1,
        privacy,
        monthlyRent: roomMonthlyRent(ensured, bedroom),
        occupied,
        openSlots: occupied ? 0 : 1,
        assignedCount: assigned.length,
        possibleRoommates: privacy === 'shared' ? Math.max(0, roomCap - 1) : 0,
      }
      roomPlacements.push(placement)
      placements.push(placement)
    } else {
      for (const bed of bedroom.beds ?? []) {
        const size = isBedSize(bed.size) ? bed.size : 'queen'
        const capacity = bed.capacity ?? bedCapacityForSize(size)
        const assigned = assignedByBed.get(bed.id) ?? []
        const occupied = assigned.length > 0
        const openSlots = occupied ? 0 : 1
        const monthlyRent =
          pricingStructure === 'bed'
            ? resolveBedMonthlyRent(ensured, bed)
            : personMonthlyRent(ensured) ?? resolveBedMonthlyRent(ensured, bed)
        const placement = {
          id: `bed:${bed.id}`,
          kind: 'bed',
          bedroomId: bedroom.id,
          bedroomLabel: bedroom.label,
          bedId: bed.id,
          bedLabel: bed.label ?? 'Bed',
          bedSizeLabel: size,
          capacity,
          privacy,
          monthlyRent,
          occupied,
          openSlots,
          assignedCount: assigned.length,
          possibleRoommates: 0,
        }
        roomPlacements.push(placement)
        placements.push(placement)
      }
    }

    bedrooms.push({
      id: bedroom.id,
      label: bedroom.label,
      privacy,
      placements: roomPlacements,
    })
  }

  const maxTenants = Math.max(
    1,
    Number(ensured.maxTenants) || maxOccupancyFromLayout(ensured.bedroomsLayout) || 1
  )
  const occupiedPeople = (occupants ?? []).reduce(
    (sum, occupant) => sum + occupantHeadcount(occupant),
    0
  )
  const availableSpots = placements.reduce(
    (sum, p) => sum + (p.occupied ? 0 : p.openSlots),
    0
  )

  return {
    pricingStructure,
    entireHomeOnly,
    totalRent,
    utilitiesIncluded: ensured.utilitiesIncluded === true,
    maxTenants,
    occupied: occupiedPeople,
    availableSpots,
    bedrooms,
    placements,
  }
}

export function serializePlacementInventory(inventory) {
  return {
    pricingStructure: inventory.pricingStructure,
    entireHomeOnly: inventory.entireHomeOnly,
    bedrooms: (inventory.bedrooms ?? []).map((room) => ({
      id: room.id,
      label: room.label,
      privacy: room.privacy,
      placements: (room.placements ?? []).map((p) => ({
        id: p.id,
        kind: p.kind,
        bedroomId: p.bedroomId,
        bedroomLabel: p.bedroomLabel,
        bedId: p.bedId,
        bedLabel: p.bedLabel,
        bedSizeLabel: p.bedSizeLabel,
        capacity: p.capacity,
        privacy: p.privacy,
        monthlyRent: p.monthlyRent,
        occupied: p.occupied,
        openSlots: p.openSlots,
        assignedCount: p.assignedCount,
        possibleRoommates: p.possibleRoommates,
      })),
    })),
  }
}
