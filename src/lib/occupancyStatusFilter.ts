import { occupantHeadcount } from '@/lib/applicantParty'
import {
  occupancyArrangementTagLabel,
  normalizeOccupancyMode,
  resolveBedroomPrivacy,
  type CanonicalOccupancyMode,
  OCCUPANCY_PREFERENCE_LABELS,
} from '@/lib/furnishedOccupancy'
import { getTenantAddress, shouldShowInOfficialTenants } from '@/lib/clientUtils'
import { getLeaseRentSchedule } from '@/lib/leaseSchedule'
import { getTenantAssignedProperty } from '@/lib/officialTenantLocationDisplay'
import { addressesMatch } from '@/lib/properties'
import { buildRentalBedOccupancy, totalBedCount } from '@/lib/rentalBeds'
import { unitTypeArrangementLabel } from '@/lib/rentalTypes'
import { getRoommateClients } from '@/lib/tenantDetails'
import type { Client, ContractData, Property, PropertyBedroom } from '@/types'

export type ArrangementTenantLabel = 'Sole Tenant' | 'Co-Tenant'

/** Display Settings → Tenant Type filter for Official Tenants. */
export type TenantTypeFilter = ArrangementTenantLabel

export const TENANT_TYPE_FILTER_OPTIONS: TenantTypeFilter[] = [
  'Sole Tenant',
  'Co-Tenant',
]

export const TENANT_TYPE_FILTER_BUTTON_WIDTH_CLASS = 'min-w-[7.5rem]'

export function getTenantTypeFilterLabel(
  filter: TenantTypeFilter | null
): string {
  return filter ?? 'Any'
}

export function nextTenantTypeFilter(
  current: TenantTypeFilter | null
): TenantTypeFilter | null {
  if (current == null) return TENANT_TYPE_FILTER_OPTIONS[0]
  const index = TENANT_TYPE_FILTER_OPTIONS.indexOf(current)
  if (index < 0 || index >= TENANT_TYPE_FILTER_OPTIONS.length - 1) return null
  return TENANT_TYPE_FILTER_OPTIONS[index + 1]
}

export function tenantTypeMatchesFilter(
  label: ArrangementTenantLabel,
  filter: TenantTypeFilter | null
): boolean {
  if (!filter) return true
  return label === filter
}

/** Resolve the occupancy mode used for filtering and tags. */
export function resolveOfficialTenantOccupancyMode(
  client: Client,
  contract: ContractData | undefined,
  properties: Property[]
): CanonicalOccupancyMode | null {
  const fromPreference = normalizeOccupancyMode(client.preferredOccupancyMode)
  if (fromPreference) return fromPreference

  const property = getTenantAssignedProperty(client, contract, properties)
  const room = property?.bedroomsLayout?.find((b) => b.id === client.bedroomId)
  const privacy = room ? resolveBedroomPrivacy(room) : null
  const label = occupancyArrangementTagLabel(client.occupancyArrangement, privacy)
  if (!label) return null

  const entry = (
    Object.entries(OCCUPANCY_PREFERENCE_LABELS) as [
      CanonicalOccupancyMode,
      string,
    ][]
  ).find(([, value]) => value === label)
  return entry?.[0] ?? null
}

/** Official tenants sharing the same bedroom (when bedroomId is set). */
export function getSharedRoomPeers(
  client: Client,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): Client[] {
  const bedroomId = client.bedroomId?.trim()
  if (!bedroomId) return []

  const contract = getContract(client.id)
  const address = getTenantAddress(client, contract)
  if (!address || address === '—') return []

  return clients.filter((peer) => {
    if (peer.id === client.id) return false
    if (peer.bedroomId !== bedroomId) return false
    if (!shouldShowInOfficialTenants(peer, getContract(peer.id))) return false
    return addressesMatch(getTenantAddress(peer, getContract(peer.id)), address)
  })
}

/** How the landlord divided the unit: whole property vs a room. */
export type OccupancyRentalKind = 'Entire home' | 'Single room'
/** Bedroom privacy within the unit (especially apartments). */
export type OccupancyRoomPrivacyLabel = 'Single room' | 'Shared room'

/** Occupant listed under a bedroom in Show Arrangements. */
export interface BedroomArrangementOccupant {
  id: string
  name: string
  /**
   * True when current rent is current (due typically on the 1st).
   * False when the tenant is past due — drives the status dot color.
   */
  rentPaidOnFirst: boolean
}

/** One bedroom in the Show Arrangements roster. */
export interface BedroomArrangementRoom {
  id: string
  /** 1-based bedroom number shown in the streamlined roster (1, 2, 3…). */
  index: number
  label: string
  occupants: BedroomArrangementOccupant[]
  /** Names only — kept for summary-line helpers and tests. */
  occupantNames: string[]
  vacant: boolean
  /** Physical beds configured in this room; 0 when layout has no beds. */
  bedCount: number
}

/** Per-bedroom living arrangement for a property household. */
export interface BedroomArrangementRoster {
  totalBedrooms: number
  totalBeds: number
  rooms: BedroomArrangementRoom[]
}

/**
 * Green status-dot rule: rent for the current cycle is not overdue
 * (due dates are typically the 1st of the month).
 */
export function isOccupantRentPaidOnFirst(
  client: Client,
  contract: ContractData | undefined
): boolean {
  if (client.paymentStatus === 'Overdue' || client.paymentStatus === 'Unpaid') {
    return false
  }
  const schedule = getLeaseRentSchedule(
    { ...client, deadlines: client.deadlines ?? [] },
    contract
  )
  const overdue =
    schedule.overduePaymentCount > 0 ||
    (schedule.daysUntilNextDue != null && schedule.daysUntilNextDue < 0)
  return !overdue
}

export interface OccupancyShareDetail {
  /** Short label for the occupancy chip title / peer section. */
  headline: string
  /** Roommate / housemate names, if any. */
  peerNames: string[]
  /** Whether peers share the same bedroom. */
  sharesRoom: boolean
  /** Entire home vs single-room rental (landlord division). */
  rentalKindLabel: OccupancyRentalKind
  /** Unit type from how the property is divided (House, Apartment, Duplex, …). */
  unitTypeLabel: string | null
  /** Single vs shared room when renting a room within the unit. */
  roomPrivacyLabel: OccupancyRoomPrivacyLabel | null
  /** Total people (couples count as 2) currently sharing the house. */
  peopleSharingHouse: number
  /** Bedrooms with no assigned official tenant; null when layout unknown. */
  openBedrooms: number | null
  /** Physical beds still unclaimed; null when bed layout unknown. */
  availableBeds: number | null
  /** Total configured beds; null when bed layout unknown. */
  totalBeds: number | null
  /** Whether roommates are welcome (landlord policy or tenant preference). */
  roommatesWelcome: boolean
  /** @deprecated Prefer roommatesWelcome — kept for callers that read openToRoommates. */
  openToRoommates: boolean
  /** Bedroom-by-bedroom roster when layout is known. */
  bedroomRoster: BedroomArrangementRoster | null
  /** Lines shown inside the occupancy tag at a glance. */
  summaryLines: string[]
}

function resolveRosterLayout(
  property: Property
): Pick<PropertyBedroom, 'id' | 'label' | 'privacy' | 'beds'>[] | null {
  if (property.bedroomsLayout?.length) {
    return property.bedroomsLayout.map((room, index) => ({
      id: room.id,
      label: room.label?.trim() || `Bedroom ${index + 1}`,
      privacy: room.privacy,
      beds: room.beds ?? [],
    }))
  }
  const count = Math.max(0, Math.floor(Number(property.bedrooms)) || 0)
  if (count <= 0) return null
  return Array.from({ length: count }, (_, index) => ({
    id: `__roster_br_${index + 1}`,
    label: `Bedroom ${index + 1}`,
    privacy: 'private' as const,
    beds: [],
  }))
}

/**
 * Build a realistic per-bedroom roster for Show Arrangements.
 * Honors existing bedroomId assignments; places unassigned tenants into vacant
 * bedrooms first (one household per room when space allows). Only co-locates
 * into an occupied room when no vacant bedrooms remain — unless tenants already
 * share a bedroomId (explicit shared arrangement).
 */
export function buildBedroomArrangementRoster(
  property: Property | undefined,
  tenants: Client[],
  getContract?: (clientId: string) => ContractData | undefined
): BedroomArrangementRoster | null {
  if (!property) return null
  const layout = resolveRosterLayout(property)
  if (!layout?.length) return null

  type RoomBucket = {
    id: string
    label: string
    privacy: ReturnType<typeof resolveBedroomPrivacy>
    bedCount: number
    occupants: Client[]
  }

  const rooms: RoomBucket[] = layout.map((bedroom) => ({
    id: bedroom.id,
    label: bedroom.label,
    privacy: resolveBedroomPrivacy(bedroom),
    bedCount: bedroom.beds?.length ?? 0,
    occupants: [],
  }))
  const byId = new Map(rooms.map((room) => [room.id, room]))

  const unassigned: Client[] = []
  for (const tenant of tenants) {
    const roomId = tenant.bedroomId?.trim()
    const room = roomId ? byId.get(roomId) : undefined
    if (room) {
      room.occupants.push(tenant)
    } else {
      unassigned.push(tenant)
    }
  }

  unassigned.sort((a, b) => a.name.localeCompare(b.name))

  for (const tenant of unassigned) {
    const empty = rooms.find((room) => room.occupants.length === 0)
    if (empty) {
      empty.occupants.push(tenant)
      continue
    }

    // No vacant bedrooms left: co-locate into the most logical shared spot.
    const target = [...rooms].sort((a, b) => {
      if (a.privacy === 'shared' && b.privacy !== 'shared') return -1
      if (b.privacy === 'shared' && a.privacy !== 'shared') return 1
      return a.occupants.length - b.occupants.length
    })[0]
    target?.occupants.push(tenant)
  }

  const totalBeds = rooms.reduce((sum, room) => sum + room.bedCount, 0)

  return {
    totalBedrooms: rooms.length,
    totalBeds,
    rooms: rooms.map((room, index) => {
      const occupants: BedroomArrangementOccupant[] = room.occupants.map(
        (tenant) => ({
          id: tenant.id,
          name: tenant.name,
          rentPaidOnFirst: isOccupantRentPaidOnFirst(
            tenant,
            getContract?.(tenant.id)
          ),
        })
      )
      return {
        id: room.id,
        index: index + 1,
        label: room.label,
        occupants,
        occupantNames: occupants.map((occupant) => occupant.name),
        vacant: occupants.length === 0,
        bedCount: room.bedCount,
      }
    }),
  }
}

function formatBedroomRosterLine(room: BedroomArrangementRoom): string {
  const bedSuffix =
    room.bedCount > 0
      ? ` · ${room.bedCount} ${room.bedCount === 1 ? 'bed' : 'beds'}`
      : ''
  if (room.vacant || room.occupants.length === 0) {
    return `${room.index} — Vacant${bedSuffix}`
  }
  return `${room.index} — ${room.occupantNames.join(', ')}${bedSuffix}`
}

function resolveRoomPrivacyLabel(
  client: Client,
  mode: CanonicalOccupancyMode | null,
  property: Property | undefined
): OccupancyRoomPrivacyLabel | null {
  if (mode === 'entire_home') return null
  if (mode === 'private_room') return 'Single room'
  if (mode === 'shared_room') return 'Shared room'

  const room = property?.bedroomsLayout?.find((b) => b.id === client.bedroomId)
  if (room) {
    return resolveBedroomPrivacy(room) === 'shared' ? 'Shared room' : 'Single room'
  }

  if (client.occupancyArrangement === 'room_rental') {
    return 'Single room'
  }
  if (
    client.occupancyArrangement === 'shared_home' ||
    client.occupancyArrangement === 'shared_apartment'
  ) {
    return null
  }
  if (client.occupancyArrangement === 'private_unit') return 'Single room'
  return null
}

function countOpenBedrooms(
  property: Property | undefined,
  tenantsOnProperty: Client[]
): number | null {
  const layout = property?.bedroomsLayout
  if (!layout || layout.length === 0) return null
  return layout.filter(
    (bedroom) => !tenantsOnProperty.some((t) => t.bedroomId === bedroom.id)
  ).length
}

function buildSummaryLines(input: {
  unitTypeLabel: string | null
  rentalKindLabel: OccupancyRentalKind
  roomPrivacyLabel: OccupancyRoomPrivacyLabel | null
  /** When true, room privacy is already the chip title — omit from body. */
  roomPrivacyInTitle: boolean
  peopleSharingHouse: number
  openBedrooms: number | null
  availableBeds: number | null
  roommatesWelcome: boolean
  headline: string
  peerNames: string[]
  bedroomRoster: BedroomArrangementRoster | null
}): string[] {
  const lines: string[] = []

  if (input.unitTypeLabel) {
    lines.push(`Unit type: ${input.unitTypeLabel}`)
  }

  lines.push(`Rental: ${input.rentalKindLabel}`)

  if (input.roomPrivacyLabel && !input.roomPrivacyInTitle) {
    lines.push(`Room type: ${input.roomPrivacyLabel}`)
  }

  if (input.peopleSharingHouse <= 1) {
    lines.push('1 person in this house')
  } else {
    lines.push(`${input.peopleSharingHouse} people sharing this house`)
  }

  if (input.bedroomRoster) {
    const { totalBedrooms, totalBeds, rooms } = input.bedroomRoster
    const bedroomPart =
      totalBedrooms === 1 ? '1 bedroom' : `${totalBedrooms} bedrooms`
    if (totalBeds > 0) {
      lines.push(
        `${bedroomPart} · ${totalBeds} ${totalBeds === 1 ? 'bed' : 'beds'}`
      )
    } else {
      lines.push(bedroomPart)
    }
    for (const room of rooms) {
      lines.push(formatBedroomRosterLine(room))
    }
  } else if (input.openBedrooms != null && input.openBedrooms > 0) {
    lines.push(
      input.openBedrooms === 1
        ? '1 bedroom open'
        : `${input.openBedrooms} bedrooms open`
    )
  }

  if (input.availableBeds != null) {
    if (input.availableBeds > 0) {
      lines.push(
        input.availableBeds === 1
          ? '1 additional bed available'
          : `${input.availableBeds} additional beds available`
      )
    } else {
      lines.push('No additional beds available')
    }
  }

  lines.push(
    input.roommatesWelcome ? 'Roommates welcome' : 'Roommates not welcome'
  )

  // Peer headline is redundant when the bedroom roster already lists occupants.
  if (!input.bedroomRoster) {
    if (input.peerNames.length > 0) {
      lines.push(`${input.headline}: ${input.peerNames.join(', ')}`)
    } else if (input.headline === 'Shared room — no roommate listed yet') {
      lines.push(input.headline)
    }
  }

  return lines
}

/** Who this tenant shares a room or property with — for in-tag summary. */
export function getOccupancyShareDetail(
  client: Client,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  properties: Property[]
): OccupancyShareDetail {
  const contract = getContract(client.id)
  const mode = resolveOfficialTenantOccupancyMode(client, contract, properties)
  const property = getTenantAssignedProperty(client, contract, properties)
  const propertyPeers = getRoommateClients(client, clients, getContract)
  const tenantsOnProperty = [client, ...propertyPeers]
  const peopleSharingHouse = tenantsOnProperty.reduce(
    (sum, occupant) => sum + occupantHeadcount(occupant),
    0
  )
  const openBedrooms = countOpenBedrooms(property, tenantsOnProperty)
  const bedroomRoster = buildBedroomArrangementRoster(
    property,
    tenantsOnProperty,
    getContract
  )
  const unitTypeLabel = unitTypeArrangementLabel(property?.propertyType)

  let totalBeds: number | null = null
  let availableBeds: number | null = null
  if (property && totalBedCount(property) > 0) {
    const bedOcc = buildRentalBedOccupancy(property, tenantsOnProperty)
    totalBeds = bedOcc.totalBeds
    availableBeds = bedOcc.availableBeds
  }

  /** Preference specifically: open to roommates (drives the arrangement asterisk). */
  const openToRoommates = mode === 'open_to_roommates'

  const roommatesWelcome =
    property?.entireHomeOnly === true
      ? false
      : openToRoommates ||
        (mode != null && mode !== 'entire_home') ||
        Boolean(
          client.occupancyArrangement &&
            client.occupancyArrangement !== 'entire_home' &&
            client.occupancyArrangement !== 'private_unit'
        )

  const rentalKindLabel: OccupancyRentalKind =
    property?.entireHomeOnly === true ||
    mode === 'entire_home' ||
    mode === 'open_to_roommates' ||
    client.occupancyArrangement === 'entire_home' ||
    client.occupancyArrangement === 'shared_home' ||
    client.occupancyArrangement === 'shared_apartment'
      ? 'Entire home'
      : 'Single room'
  const roomPrivacyLabel = resolveRoomPrivacyLabel(client, mode, property)

  const roomPeers = getSharedRoomPeers(client, clients, getContract)
  let headline: string
  let peerNames: string[]
  let sharesRoom: boolean

  if (roomPeers.length > 0) {
    headline = 'Shares room with'
    peerNames = roomPeers.map((p) => p.name)
    sharesRoom = true
  } else if (propertyPeers.length > 0) {
    sharesRoom =
      mode === 'shared_room' || client.occupancyArrangement === 'room_rental'
    headline = sharesRoom ? 'Shares room with' : 'Shares property with'
    peerNames = propertyPeers.map((p) => p.name)
  } else if (mode === 'entire_home') {
    headline = 'Renting the entire home'
    peerNames = []
    sharesRoom = false
  } else if (mode === 'private_room') {
    headline = 'Single room — no roommates in this room'
    peerNames = []
    sharesRoom = false
  } else if (mode === 'shared_room') {
    headline = 'Shared room — no roommate listed yet'
    peerNames = []
    sharesRoom = true
  } else {
    headline = 'Only tenant on this property'
    peerNames = []
    sharesRoom = false
  }

  // Room privacy appears in the chip subtitle (not the Sole/Co-Tenant title).
  const summaryLines = buildSummaryLines({
    unitTypeLabel,
    rentalKindLabel,
    roomPrivacyLabel,
    roomPrivacyInTitle: false,
    peopleSharingHouse,
    openBedrooms,
    availableBeds,
    roommatesWelcome,
    headline,
    peerNames,
    bedroomRoster,
  })

  return {
    headline,
    peerNames,
    sharesRoom,
    rentalKindLabel,
    unitTypeLabel,
    roomPrivacyLabel,
    peopleSharingHouse,
    openBedrooms,
    availableBeds,
    totalBeds,
    roommatesWelcome,
    openToRoommates,
    bedroomRoster,
    summaryLines,
  }
}

/**
 * Sole Tenant = rents the entire house / apartment / duplex with no roommates.
 * Co-Tenant = has roommates, or rents a room within a divided unit.
 * Roommate preference is shown separately on the arrangement chip.
 */
export function resolveArrangementTenantLabel(
  shareDetail: OccupancyShareDetail
): ArrangementTenantLabel {
  const sharesProperty =
    shareDetail.peopleSharingHouse > 1 || shareDetail.peerNames.length > 0
  if (shareDetail.rentalKindLabel === 'Entire home' && !sharesProperty) {
    return 'Sole Tenant'
  }
  return 'Co-Tenant'
}

/**
 * Chip title in the Arrangement column when Show Arrangements is on:
 * Sole Tenant (pays full rent alone) or Co-Tenant.
 */
export function resolveArrangementDisplayTitle(
  shareDetail: OccupancyShareDetail
): ArrangementTenantLabel {
  return resolveArrangementTenantLabel(shareDetail)
}

/**
 * Roommate count for co-tenants (peers sharing the property, excluding self).
 */
export function resolveArrangementRoommateCount(
  shareDetail: OccupancyShareDetail
): number {
  return Math.max(
    shareDetail.peerNames.length,
    Math.max(0, shareDetail.peopleSharingHouse - 1)
  )
}

/**
 * Chip subtitle: “Entire Home” for sole tenants; roommate count for co-tenants
 * (e.g. “2 roommates”). Unit type is not appended (avoid “Entire Home in House”).
 */
export function resolveArrangementDisplayDetail(
  shareDetail: OccupancyShareDetail
): string {
  if (resolveArrangementTenantLabel(shareDetail) === 'Sole Tenant') {
    return 'Entire Home'
  }

  const roommateCount = resolveArrangementRoommateCount(shareDetail)
  if (roommateCount === 1) return '1 roommate'
  if (roommateCount > 1) return `${roommateCount} roommates`

  const shared =
    shareDetail.roomPrivacyLabel === 'Shared room' || shareDetail.sharesRoom
  return shared ? 'Shared Room' : 'Single Room'
}
