import { getGoogleMaps, getMapsApiKey, loadGoogleMaps } from '@/lib/googleMaps'

export interface GeocodedPoint {
  lat: number
  lng: number
  label: string
}

const cache = new Map<string, GeocodedPoint | null>()

function cacheKey(query: string): string {
  return query.trim().toLowerCase()
}

/**
 * Geocode a free-text address/place via the Google Maps Geocoder.
 * Results are memoized for the session. Returns null when Maps is unavailable
 * or no match is found.
 */
export async function geocodeAddress(query: string): Promise<GeocodedPoint | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const key = cacheKey(trimmed)
  if (cache.has(key)) return cache.get(key) ?? null

  const apiKey = getMapsApiKey()
  if (!apiKey) {
    cache.set(key, null)
    return null
  }

  try {
    await loadGoogleMaps(apiKey)
  } catch {
    cache.set(key, null)
    return null
  }

  const maps = getGoogleMaps() as
    | {
        Geocoder?: new () => {
          geocode: (
            req: { address: string },
            cb: (
              results: Array<{
                formatted_address?: string
                geometry?: {
                  location?: { lat: () => number; lng: () => number }
                }
              }> | null,
              status: string
            ) => void
          ) => void
        }
      }
    | undefined

  if (!maps?.Geocoder) {
    cache.set(key, null)
    return null
  }

  const point = await new Promise<GeocodedPoint | null>((resolve) => {
    const geocoder = new maps.Geocoder!()
    geocoder.geocode({ address: trimmed }, (results, status) => {
      const loc = results?.[0]?.geometry?.location
      if (status !== 'OK' || !loc) {
        resolve(null)
        return
      }
      resolve({
        lat: loc.lat(),
        lng: loc.lng(),
        label: results?.[0]?.formatted_address?.trim() || trimmed,
      })
    })
  })

  cache.set(key, point)
  return point
}

/** Read finite lat/lng from property address details when present. */
export function readStoredPropertyCoordinates(property: {
  addressDetails?: { lat?: number | string; lng?: number | string }
}): { lat: number; lng: number } | null {
  const lat = Number(property.addressDetails?.lat)
  const lng = Number(property.addressDetails?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Resolve property coordinates from stored details, or geocode the address. */
export async function resolvePropertyCoordinates(property: {
  id: string
  address: string
  addressDetails?: { lat?: number | string; lng?: number | string }
}): Promise<GeocodedPoint | null> {
  const stored = readStoredPropertyCoordinates(property)
  if (stored) {
    return { ...stored, label: property.address }
  }
  return geocodeAddress(property.address)
}
