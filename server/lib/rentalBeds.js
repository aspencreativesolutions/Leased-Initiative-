/** Server-side bed layout helpers (mirrors src/lib/rentalBeds.ts). */

export const BED_SIZES = ['twin', 'full', 'queen', 'king']

export function bedCapacityForSize(size) {
  return size === 'twin' ? 1 : 2
}

export function isBedSize(value) {
  return typeof value === 'string' && BED_SIZES.includes(value)
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createBed(size = 'queen', index = 1) {
  return {
    id: createId('bed'),
    label: `Bed ${index}`,
    size,
    capacity: bedCapacityForSize(size),
  }
}

export function createBedroom(index, beds) {
  return {
    id: createId('br'),
    label: `Bedroom ${index}`,
    beds: beds ?? [createBed('queen', 1)],
  }
}

export function defaultBedroomsLayout(bedroomCount) {
  const count = Math.max(0, Math.floor(Number(bedroomCount)) || 0)
  if (count === 0) return [createBedroom(1, [createBed('queen', 1)])]
  return Array.from({ length: count }, (_, i) => createBedroom(i + 1))
}

export function maxOccupancyFromLayout(layout) {
  if (!Array.isArray(layout) || layout.length === 0) return 0
  let sum = 0
  for (const room of layout) {
    for (const bed of room.beds ?? []) {
      sum += bedCapacityForSize(isBedSize(bed.size) ? bed.size : 'queen')
    }
  }
  return sum
}

export function normalizeBedroomsLayout(raw, bedroomCount) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultBedroomsLayout(bedroomCount)
  }

  return raw.map((room, roomIndex) => {
    const bedsRaw = Array.isArray(room?.beds) && room.beds.length > 0 ? room.beds : [createBed('queen', 1)]
    return {
      id: typeof room?.id === 'string' && room.id ? room.id : createId('br'),
      label:
        typeof room?.label === 'string' && room.label.trim()
          ? room.label.trim()
          : `Bedroom ${roomIndex + 1}`,
      beds: bedsRaw.map((bed, bedIndex) => {
        const size = isBedSize(bed?.size) ? bed.size : 'queen'
        const customRent = Number(bed?.monthlyRent)
        return {
          id: typeof bed?.id === 'string' && bed.id ? bed.id : createId('bed'),
          label:
            typeof bed?.label === 'string' && bed.label.trim()
              ? bed.label.trim()
              : `Bed ${bedIndex + 1}`,
          size,
          capacity: bedCapacityForSize(size),
          ...(Number.isFinite(customRent) && customRent > 0
            ? { monthlyRent: Math.round(customRent * 100) / 100 }
            : {}),
        }
      }),
    }
  })
}

export function isCompleteBedroomsLayout(layout) {
  if (!Array.isArray(layout) || layout.length === 0) return false
  return layout.every(
    (room) =>
      Array.isArray(room.beds) &&
      room.beds.length > 0 &&
      room.beds.every((bed) => isBedSize(bed.size))
  )
}

export function ensurePropertyBedLayout(property) {
  if (!property || typeof property !== 'object') return property
  const layout = normalizeBedroomsLayout(property.bedroomsLayout, property.bedrooms)
  return {
    ...property,
    bedroomsLayout: layout,
    bedrooms: layout.length,
    maxTenants: Math.max(1, maxOccupancyFromLayout(layout)),
  }
}
