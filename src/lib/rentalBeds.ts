import type {
  BedSize,
  Client,
  Property,
  PropertyBed,
  PropertyBedroom,
} from '@/types'
import { BED_SIZES } from '@/types'

export const BED_SIZE_LABELS: Record<BedSize, string> = {
  twin: 'Twin / Single',
  full: 'Full / Double',
  queen: 'Queen',
  king: 'King',
}

export function bedCapacityForSize(size: BedSize): 1 | 2 {
  return size === 'twin' ? 1 : 2
}

export function isBedSize(value: unknown): value is BedSize {
  return typeof value === 'string' && (BED_SIZES as string[]).includes(value)
}

export function createBedroomId(): string {
  return `br_${Math.random().toString(36).slice(2, 10)}`
}

export function createBedId(): string {
  return `bed_${Math.random().toString(36).slice(2, 10)}`
}

export function createBed(size: BedSize = 'queen', index = 1): PropertyBed {
  return {
    id: createBedId(),
    label: `Bed ${index}`,
    size,
    capacity: bedCapacityForSize(size),
  }
}

export function createBedroom(
  index: number,
  beds?: PropertyBed[],
  privacy: 'private' | 'shared' = 'private'
): PropertyBedroom {
  return {
    id: createBedroomId(),
    label: `Bedroom ${index}`,
    privacy,
    beds: beds ?? [createBed('queen', 1)],
  }
}

/** Default layout: one Queen per bedroom (used for migration). */
export function defaultBedroomsLayout(bedroomCount: number): PropertyBedroom[] {
  const count = Math.max(0, Math.floor(bedroomCount) || 0)
  if (count === 0) {
    // Studios / zero-bedroom: treat as one sleeping room with one Queen
    return [createBedroom(1, [createBed('queen', 1)])]
  }
  return Array.from({ length: count }, (_, i) => createBedroom(i + 1))
}

export function flattenBeds(layout: PropertyBedroom[] | undefined): PropertyBed[] {
  if (!layout?.length) return []
  return layout.flatMap((room) => room.beds ?? [])
}

export function totalBedCount(property: Pick<Property, 'bedroomsLayout'>): number {
  return flattenBeds(property.bedroomsLayout).length
}

export function maxOccupancyFromLayout(
  layout: PropertyBedroom[] | undefined
): number {
  const beds = flattenBeds(layout)
  if (beds.length === 0) return 0
  return beds.reduce((sum, bed) => sum + bed.capacity, 0)
}

export function findBedInLayout(
  layout: PropertyBedroom[] | undefined,
  bedroomId?: string | null,
  bedId?: string | null
): { bedroom: PropertyBedroom; bed: PropertyBed } | null {
  if (!layout?.length || !bedId) return null
  for (const bedroom of layout) {
    if (bedroomId && bedroom.id !== bedroomId) continue
    const bed = bedroom.beds.find((b) => b.id === bedId)
    if (bed) return { bedroom, bed }
  }
  // Fallback: search all bedrooms by bed id only
  if (!bedroomId) {
    for (const bedroom of layout) {
      const bed = bedroom.beds.find((b) => b.id === bedId)
      if (bed) return { bedroom, bed }
    }
  }
  return null
}

export function formatBedAssignmentLabel(
  bedroom: PropertyBedroom,
  bed: PropertyBed
): string {
  const sizeLabel = BED_SIZE_LABELS[bed.size]
  return `${bedroom.label} · ${sizeLabel} Bed`
}

/** Sync bedrooms count + maxTenants from layout; migrate missing layouts. */
export function ensurePropertyBedLayout(property: Property): Property {
  let layout = property.bedroomsLayout
  if (!layout?.length) {
    layout = defaultBedroomsLayout(property.bedrooms)
  } else {
    layout = layout.map((room, roomIndex) => ({
      ...room,
      id: room.id || createBedroomId(),
      label: room.label?.trim() || `Bedroom ${roomIndex + 1}`,
      privacy:
        room.privacy === 'private' || room.privacy === 'shared'
          ? room.privacy
          : room.beds && room.beds.length > 1
            ? 'shared'
            : 'private',
      beds: (room.beds?.length ? room.beds : [createBed('queen', 1)]).map(
        (bed, bedIndex) => {
          const size = isBedSize(bed.size) ? bed.size : 'queen'
          return {
            ...bed,
            id: bed.id || createBedId(),
            label: bed.label?.trim() || `Bed ${bedIndex + 1}`,
            size,
            capacity: bedCapacityForSize(size),
            ...(Number.isFinite(Number(bed.monthlyRent)) && Number(bed.monthlyRent) > 0
              ? { monthlyRent: Number(bed.monthlyRent) }
              : {}),
          }
        }
      ),
    }))
  }

  const bedrooms = layout.length
  const maxTenants = Math.max(1, maxOccupancyFromLayout(layout))

  return {
    ...property,
    bedroomsLayout: layout,
    bedrooms,
    maxTenants,
  }
}

export function isCompleteBedroomsLayout(layout: PropertyBedroom[] | undefined): boolean {
  if (!layout?.length) return false
  return layout.every(
    (room) =>
      room.beds.length > 0 &&
      room.beds.every((bed) => isBedSize(bed.size) && (bed.capacity === 1 || bed.capacity === 2))
  )
}

export interface RentalBedOccupancy {
  totalBeds: number
  occupiedBeds: number
  availableBeds: number
  currentOccupants: number
  maxOccupancy: number
  /** bedId → tenants assigned */
  tenantsByBedId: Map<string, Client[]>
}

/**
 * Bed is occupied when ≥1 assigned tenant in `occupants`.
 * People occupancy counts every occupant (assigned + unassigned).
 * Pass active/official tenants from the caller (avoids circular imports).
 */
export function buildRentalBedOccupancy(
  property: Property,
  occupants: Client[]
): RentalBedOccupancy {
  const ensured = ensurePropertyBedLayout(property)
  const beds = flattenBeds(ensured.bedroomsLayout)

  const tenantsByBedId = new Map<string, Client[]>()
  for (const bed of beds) {
    tenantsByBedId.set(bed.id, [])
  }

  let assignedCount = 0
  for (const tenant of occupants) {
    if (!tenant.bedId) continue
    const list = tenantsByBedId.get(tenant.bedId)
    if (list) {
      list.push(tenant)
      assignedCount += 1
    }
  }

  // Tenants without a valid bed assignment still count as people occupants.
  const unassigned = occupants.filter(
    (t) => !t.bedId || !tenantsByBedId.has(t.bedId)
  )
  const currentOccupants = assignedCount + unassigned.length

  let occupiedBeds = 0
  for (const list of tenantsByBedId.values()) {
    if (list.length > 0) occupiedBeds += 1
  }

  const totalBeds = beds.length
  return {
    totalBeds,
    occupiedBeds,
    availableBeds: Math.max(0, totalBeds - occupiedBeds),
    currentOccupants,
    maxOccupancy: Math.max(1, maxOccupancyFromLayout(ensured.bedroomsLayout)),
    tenantsByBedId,
  }
}

/** Monthly rent for one physical bed space (not per person). */
export function resolveBedMonthlyRent(
  property: Property,
  bed: PropertyBed
): number | null {
  const custom = Number(bed.monthlyRent)
  if (Number.isFinite(custom) && custom > 0) {
    return Math.round(custom * 100) / 100
  }
  const unit = Number(property.monthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null
  const beds = Math.max(1, totalBedCount(property))
  return Math.round((unit / beds) * 100) / 100
}

/**
 * Tenant share of their assigned bed’s rent.
 * Couple on one Queen → each pays half of that one bed unit (unless custom share).
 */
export function tenantShareForAssignedBed(
  property: Property,
  client: Client,
  cohortOnSameBed: Client[]
): number | null {
  const custom = Number(client.rentShareAmount)
  if (Number.isFinite(custom) && custom > 0) {
    return Math.round(custom * 100) / 100
  }

  const found = findBedInLayout(
    property.bedroomsLayout,
    client.bedroomId,
    client.bedId
  )
  if (!found) {
    // Fallback: equal split across beds, then among unassigned cohort length 1
    const bedRent =
      totalBedCount(property) > 0 && Number(property.monthlyRent) > 0
        ? Number(property.monthlyRent) / totalBedCount(property)
        : null
    return bedRent != null ? Math.round(bedRent * 100) / 100 : null
  }

  const bedRent = resolveBedMonthlyRent(property, found.bed)
  if (bedRent == null) return null
  const sharers = Math.max(1, cohortOnSameBed.length)
  return Math.round((bedRent / sharers) * 100) / 100
}

export interface LayoutConflict {
  bedId: string
  bedroomLabel: string
  bedLabel: string
  tenants: { id: string; name: string }[]
  reason: 'removed' | 'capacity_reduced'
}

/**
 * Detect tenants who would be orphaned or over-capacity if layout changes.
 */
export function findLayoutAssignmentConflicts(
  previous: Property,
  nextLayout: PropertyBedroom[],
  tenants: Client[]
): LayoutConflict[] {
  const prev = ensurePropertyBedLayout(previous)
  const nextBeds = new Map<string, PropertyBed>()
  const nextBedRoom = new Map<string, PropertyBedroom>()
  for (const room of nextLayout) {
    for (const bed of room.beds) {
      nextBeds.set(bed.id, bed)
      nextBedRoom.set(bed.id, room)
    }
  }

  const conflicts: LayoutConflict[] = []
  const assigned = tenants.filter((t) => t.bedId)

  for (const tenant of assigned) {
    const bedId = tenant.bedId!
    const prevFound = findBedInLayout(prev.bedroomsLayout, tenant.bedroomId, bedId)
    const nextBed = nextBeds.get(bedId)

    if (!nextBed) {
      const existing = conflicts.find((c) => c.bedId === bedId && c.reason === 'removed')
      if (existing) {
        existing.tenants.push({ id: tenant.id, name: tenant.name })
      } else {
        conflicts.push({
          bedId,
          bedroomLabel: prevFound?.bedroom.label ?? 'Bedroom',
          bedLabel: prevFound?.bed.label ?? 'Bed',
          tenants: [{ id: tenant.id, name: tenant.name }],
          reason: 'removed',
        })
      }
      continue
    }

    // Capacity shrink: collect all tenants on this bed and check
  }

  // Capacity checks per remaining bed
  const byBed = new Map<string, Client[]>()
  for (const tenant of assigned) {
    if (!nextBeds.has(tenant.bedId!)) continue
    const list = byBed.get(tenant.bedId!) ?? []
    list.push(tenant)
    byBed.set(tenant.bedId!, list)
  }

  for (const [bedId, list] of byBed) {
    const bed = nextBeds.get(bedId)!
    if (list.length > bed.capacity) {
      const room = nextBedRoom.get(bedId)!
      conflicts.push({
        bedId,
        bedroomLabel: room.label,
        bedLabel: bed.label ?? 'Bed',
        tenants: list.map((t) => ({ id: t.id, name: t.name })),
        reason: 'capacity_reduced',
      })
    }
  }

  return conflicts
}

/** Beds that still have an open sleeping slot (for assignment UI). */
export function bedsWithOpenCapacity(
  property: Property,
  occupants: Client[],
  options?: { ignoreClientId?: string }
): { bedroom: PropertyBedroom; bed: PropertyBed; assigned: Client[]; openSlots: number }[] {
  const ensured = ensurePropertyBedLayout(property)
  const occ = buildRentalBedOccupancy(ensured, occupants)
  const results: {
    bedroom: PropertyBedroom
    bed: PropertyBed
    assigned: Client[]
    openSlots: number
  }[] = []

  for (const bedroom of ensured.bedroomsLayout ?? []) {
    for (const bed of bedroom.beds) {
      let assigned = occ.tenantsByBedId.get(bed.id) ?? []
      if (options?.ignoreClientId) {
        assigned = assigned.filter((t) => t.id !== options.ignoreClientId)
      }
      const openSlots = Math.max(0, bed.capacity - assigned.length)
      results.push({ bedroom, bed, assigned, openSlots })
    }
  }
  return results
}
