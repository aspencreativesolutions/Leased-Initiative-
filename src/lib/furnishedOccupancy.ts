import type {
  BedroomPrivacy,
  Client,
  OccupancyArrangement,
  PreferredOccupancyMode,
  Property,
  PropertyBed,
  PropertyBedroom,
  PropertyPricingStructure,
} from '@/types'
import {
  BED_SIZE_LABELS,
  ensurePropertyBedLayout,
  resolveBedMonthlyRent,
  totalBedCount,
} from '@/lib/rentalBeds'
import { formatUsd } from '@/lib/rentalRent'

/** Canonical occupancy preference (legacy aliases collapsed). */
export type CanonicalOccupancyMode =
  | 'entire_home'
  | 'open_to_roommates'
  | 'private_room'
  | 'shared_room'

export const OCCUPANCY_PREFERENCE_LABELS: Record<CanonicalOccupancyMode, string> = {
  entire_home: 'Renting Entire Home',
  open_to_roommates: 'Open to Roommates',
  private_room: 'Private Room',
  shared_room: 'Shared Room',
}

export function normalizeOccupancyMode(
  mode: PreferredOccupancyMode | string | null | undefined
): CanonicalOccupancyMode | null {
  if (!mode) return null
  const raw = String(mode).trim().toLowerCase()
  if (raw === 'full_rent' || raw === 'entire_home') return 'entire_home'
  if (raw === 'roommates' || raw === 'open_to_roommates') return 'open_to_roommates'
  if (raw === 'private_room') return 'private_room'
  if (raw === 'shared_room') return 'shared_room'
  return null
}

export function occupancyPreferenceLabel(
  mode: PreferredOccupancyMode | string | null | undefined
): string | null {
  const canonical = normalizeOccupancyMode(mode)
  return canonical ? OCCUPANCY_PREFERENCE_LABELS[canonical] : null
}

/** Label for official tenants from arrangement (+ optional room privacy). */
export function occupancyArrangementTagLabel(
  arrangement: OccupancyArrangement | null | undefined,
  privacy?: BedroomPrivacy | null
): string | null {
  if (!arrangement) return null
  if (arrangement === 'entire_home') return OCCUPANCY_PREFERENCE_LABELS.entire_home
  if (arrangement === 'private_unit') return OCCUPANCY_PREFERENCE_LABELS.private_room
  if (arrangement === 'room_rental') {
    return privacy === 'shared'
      ? OCCUPANCY_PREFERENCE_LABELS.shared_room
      : OCCUPANCY_PREFERENCE_LABELS.private_room
  }
  if (arrangement === 'shared_home' || arrangement === 'shared_apartment') {
    if (privacy === 'private') return OCCUPANCY_PREFERENCE_LABELS.private_room
    if (privacy === 'shared') return OCCUPANCY_PREFERENCE_LABELS.shared_room
    return OCCUPANCY_PREFERENCE_LABELS.open_to_roommates
  }
  return null
}

export function resolveBedroomPrivacy(room: PropertyBedroom): BedroomPrivacy {
  if (room.privacy === 'private' || room.privacy === 'shared') return room.privacy
  const beds = room.beds ?? []
  if (beds.length > 1) return 'shared'
  if (beds.some((b) => b.capacity > 1)) return 'shared'
  return 'private'
}

export function pricingStructureLabel(
  structure: PropertyPricingStructure | string | null | undefined
): string {
  if (structure === 'bed') return 'Priced per bed'
  if (structure === 'room') return 'Priced per room'
  if (structure === 'person') return 'Priced per person'
  return 'Priced for entire home'
}

export function bedCapacityLabel(capacity: 1 | 2): string {
  return capacity === 1 ? 'Single-person bed' : 'Two-person bed'
}

export function ordinalPlacement(n: number): string {
  const abs = Math.max(1, Math.floor(n))
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) return `${abs}th`
  switch (abs % 10) {
    case 1:
      return `${abs}st`
    case 2:
      return `${abs}nd`
    case 3:
      return `${abs}rd`
    default:
      return `${abs}th`
  }
}

/**
 * Occupancy narrative for applicants.
 * `spotsOpenAfterYou` is remaining capacity after this applicant (roommate mode).
 */
export function buildOccupancyPlacementCopy(input: {
  occupied: number
  availableSpots: number
  entireHome?: boolean
}): {
  placementLine: string
  spotsOpenAfterYou: number
  spotsOpenLabel: string | null
} {
  const occupied = Math.max(0, Math.floor(input.occupied))
  const available = Math.max(0, Math.floor(input.availableSpots))
  const spotsOpenAfterYou = input.entireHome
    ? 0
    : Math.max(0, available - 1)

  if (input.entireHome) {
    return {
      placementLine:
        occupied === 0
          ? 'You would rent this home exclusively.'
          : 'This home is already occupied.',
      spotsOpenAfterYou: 0,
      spotsOpenLabel: null,
    }
  }

  if (occupied === 0) {
    return {
      placementLine: 'You would be the first tenant placed in this home.',
      spotsOpenAfterYou,
      spotsOpenLabel:
        spotsOpenAfterYou === 1
          ? '1 spot open'
          : `${spotsOpenAfterYou} spots open`,
    }
  }

  const nextOrder = occupied + 1
  return {
    placementLine:
      occupied === 1
        ? `1 tenant is already placed in this home. You would be the ${ordinalPlacement(nextOrder)} tenant.`
        : `${occupied} tenants are already placed in this home. You would be the ${ordinalPlacement(nextOrder)} tenant.`,
    spotsOpenAfterYou,
    spotsOpenLabel:
      spotsOpenAfterYou === 1
        ? '1 spot open'
        : `${spotsOpenAfterYou} spots open`,
  }
}

export type FurnishedPlacementKind = 'bed' | 'room'

export type FurnishedPlacement = {
  id: string
  kind: FurnishedPlacementKind
  bedroomId: string
  bedroomLabel: string
  bedId?: string
  bedLabel?: string
  bedSizeLabel?: string
  capacity: 1 | 2
  privacy: BedroomPrivacy
  monthlyRent: number | null
  occupied: boolean
  openSlots: number
  assignedCount: number
  /** Current roommates already on this placement (for confirmation copy). */
  possibleRoommates: number
}

export type FurnishedPlacementInventory = {
  pricingStructure: PropertyPricingStructure
  entireHomeOnly: boolean
  totalRent: number | null
  utilitiesIncluded: boolean
  maxTenants: number
  occupied: number
  availableSpots: number
  bedrooms: {
    id: string
    label: string
    privacy: BedroomPrivacy
    placements: FurnishedPlacement[]
  }[]
  placements: FurnishedPlacement[]
}

function roomMonthlyRent(
  property: Property,
  bedroom: PropertyBedroom
): number | null {
  const unit = Number(property.monthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null
  const rooms = Math.max(1, property.bedroomsLayout?.length ?? 1)
  const customBeds = (bedroom.beds ?? [])
    .map((b) => Number(b.monthlyRent))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (customBeds.length === (bedroom.beds?.length ?? 0) && customBeds.length > 0) {
    return Math.round(customBeds.reduce((a, b) => a + b, 0) * 100) / 100
  }
  return Math.round((unit / rooms) * 100) / 100
}

function personMonthlyRent(property: Property): number | null {
  const unit = Number(property.monthlyRent)
  const max = Math.max(1, Number(property.maxTenants) || 1)
  if (!Number.isFinite(unit) || unit <= 0) return null
  return Math.round((unit / max) * 100) / 100
}

/**
 * Build selectable furnished placements from landlord layout + current occupants.
 */
export function buildFurnishedPlacementInventory(
  property: Property,
  occupants: Pick<Client, 'id' | 'bedroomId' | 'bedId' | 'occupancyArrangement'>[]
): FurnishedPlacementInventory {
  const ensured = ensurePropertyBedLayout(property)
  const pricingStructure: PropertyPricingStructure =
    ensured.pricingStructure ?? (ensured.furnished ? 'bed' : 'person')
  const entireHomeOnly = ensured.entireHomeOnly === true
  const totalRent =
    Number.isFinite(Number(ensured.monthlyRent)) && Number(ensured.monthlyRent) > 0
      ? Math.round(Number(ensured.monthlyRent) * 100) / 100
      : null

  const assignedByBed = new Map<string, number>()
  const assignedByRoom = new Map<string, number>()
  for (const occupant of occupants) {
    if (occupant.bedId) {
      assignedByBed.set(occupant.bedId, (assignedByBed.get(occupant.bedId) ?? 0) + 1)
    }
    if (occupant.bedroomId) {
      assignedByRoom.set(
        occupant.bedroomId,
        (assignedByRoom.get(occupant.bedroomId) ?? 0) + 1
      )
    }
  }

  const bedrooms: FurnishedPlacementInventory['bedrooms'] = []
  const placements: FurnishedPlacement[] = []

  for (const bedroom of ensured.bedroomsLayout ?? []) {
    const privacy = resolveBedroomPrivacy(bedroom)
    const roomPlacements: FurnishedPlacement[] = []

    if (pricingStructure === 'room') {
      const assigned = assignedByRoom.get(bedroom.id) ?? 0
      const roomCap = Math.max(
        1,
        (bedroom.beds ?? []).reduce((sum, b) => sum + b.capacity, 0)
      )
      // Room pricing: one placement per bedroom; occupied when anyone is assigned.
      const occupied = assigned > 0
      const placement: FurnishedPlacement = {
        id: `room:${bedroom.id}`,
        kind: 'room',
        bedroomId: bedroom.id,
        bedroomLabel: bedroom.label,
        capacity: roomCap >= 2 ? 2 : 1,
        privacy,
        monthlyRent: roomMonthlyRent(ensured, bedroom),
        occupied,
        openSlots: occupied ? 0 : 1,
        assignedCount: assigned,
        possibleRoommates: privacy === 'shared' ? Math.max(0, roomCap - 1) : 0,
      }
      roomPlacements.push(placement)
      placements.push(placement)
    } else {
      for (const bed of bedroom.beds ?? []) {
        const assigned = assignedByBed.get(bed.id) ?? 0
        const openSlots = Math.max(0, bed.capacity - assigned)
        const occupied = openSlots === 0
        const monthlyRent =
          pricingStructure === 'bed'
            ? resolveBedMonthlyRent(ensured, bed)
            : personMonthlyRent(ensured) ?? resolveBedMonthlyRent(ensured, bed)
        const placement: FurnishedPlacement = {
          id: `bed:${bed.id}`,
          kind: 'bed',
          bedroomId: bedroom.id,
          bedroomLabel: bedroom.label,
          bedId: bed.id,
          bedLabel: bed.label ?? 'Bed',
          bedSizeLabel: BED_SIZE_LABELS[bed.size],
          capacity: bed.capacity,
          privacy,
          monthlyRent,
          occupied,
          openSlots,
          assignedCount: assigned,
          possibleRoommates:
            privacy === 'shared'
              ? Math.max(0, bed.capacity - 1 + ((bedroom.beds?.length ?? 1) - 1))
              : Math.max(0, bed.capacity - 1),
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

  const maxTenants = Math.max(1, Number(ensured.maxTenants) || 1)
  const occupiedPeople = occupants.length
  const availableSpots = Math.max(0, maxTenants - occupiedPeople)

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

export function findPlacementById(
  inventory: FurnishedPlacementInventory,
  placementId: string | null | undefined
): FurnishedPlacement | null {
  if (!placementId) return null
  return inventory.placements.find((p) => p.id === placementId) ?? null
}

export function placementConfirmationSummary(input: {
  placement: FurnishedPlacement
  utilitiesIncluded: boolean
  mode: CanonicalOccupancyMode
}): {
  bedroom: string
  bed: string | null
  monthlyRentLabel: string
  roomPrivacy: string
  roommateLine: string
  utilitiesLabel: string
} {
  const { placement } = input
  const roommatesAlready = placement.assignedCount
  const possible = placement.possibleRoommates
  let roommateLine: string
  if (placement.privacy === 'private') {
    roommateLine = 'Private room — no roommates in this room'
  } else if (roommatesAlready > 0) {
    roommateLine = `${roommatesAlready} roommate${roommatesAlready === 1 ? '' : 's'} currently in this placement · up to ${possible} possible`
  } else if (possible > 0) {
    roommateLine = `Shared room · up to ${possible} roommate${possible === 1 ? '' : 's'} possible`
  } else {
    roommateLine = 'Shared room'
  }

  return {
    bedroom: placement.bedroomLabel,
    bed: placement.kind === 'bed' ? placement.bedLabel ?? placement.bedSizeLabel ?? 'Bed' : null,
    monthlyRentLabel:
      placement.monthlyRent != null
        ? `${formatUsd(placement.monthlyRent)}/month`
        : 'Rent TBA',
    roomPrivacy: placement.privacy === 'private' ? 'Private room' : 'Shared room',
    roommateLine,
    utilitiesLabel: input.utilitiesIncluded
      ? 'Utilities included'
      : 'Utilities not included',
  }
}

/** Serialize inventory for public landlord property details (no tenant PII). */
export function serializePlacementInventoryForApi(
  inventory: FurnishedPlacementInventory
): {
  pricingStructure: PropertyPricingStructure
  entireHomeOnly: boolean
  bedrooms: {
    id: string
    label: string
    privacy: BedroomPrivacy
    placements: {
      id: string
      kind: FurnishedPlacementKind
      bedroomId: string
      bedroomLabel: string
      bedId?: string
      bedLabel?: string
      bedSizeLabel?: string
      capacity: 1 | 2
      privacy: BedroomPrivacy
      monthlyRent: number | null
      occupied: boolean
      openSlots: number
      assignedCount: number
      possibleRoommates: number
    }[]
  }[]
} {
  return {
    pricingStructure: inventory.pricingStructure,
    entireHomeOnly: inventory.entireHomeOnly,
    bedrooms: inventory.bedrooms.map((room) => ({
      id: room.id,
      label: room.label,
      privacy: room.privacy,
      placements: room.placements.map((p) => ({
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

export function modeFromPlacement(
  placement: FurnishedPlacement | null,
  fallback: CanonicalOccupancyMode
): CanonicalOccupancyMode {
  if (!placement) return fallback
  if (placement.privacy === 'private') return 'private_room'
  if (placement.privacy === 'shared') return 'shared_room'
  return fallback
}

/** Equal-split helper when no placement rent is set. */
export function equalSplitRent(
  totalRent: number | null | undefined,
  headcount: number
): number | null {
  if (totalRent == null || !Number.isFinite(totalRent) || totalRent <= 0) return null
  const n = Math.max(1, headcount)
  return Math.round((totalRent / n) * 100) / 100
}

export function bedPersonCapacityLabel(bed: PropertyBed): string {
  return bedCapacityLabel(bed.capacity)
}

export function hasOpenPlacements(inventory: FurnishedPlacementInventory): boolean {
  return inventory.placements.some((p) => !p.occupied && p.openSlots > 0)
}

export function totalBedSpaces(property: Property): number {
  return totalBedCount(property)
}
