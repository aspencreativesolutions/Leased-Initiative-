/** Shared Google Maps JavaScript API loader (Places + core Map/Circle). */

const GOOGLE_MAPS_SCRIPT_ID = 'leased-google-maps-places'

export function getMapsApiKey(): string {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
}

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      places?: unknown
      Map?: unknown
      Circle?: unknown
      Marker?: unknown
      LatLngBounds?: unknown
      event?: { clearInstanceListeners: (instance: unknown) => void }
    }
  }
}

export function getGoogleMaps(): NonNullable<GoogleMapsWindow['google']>['maps'] | undefined {
  return (window as GoogleMapsWindow).google?.maps
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (getGoogleMaps()?.places && getGoogleMaps()?.Map) {
    return Promise.resolve()
  }

  const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      if (getGoogleMaps()?.places && getGoogleMaps()?.Map) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}
