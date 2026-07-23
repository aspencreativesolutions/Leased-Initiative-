import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/FormField'
import {
  distanceMiles,
  formatRegionRadiusSummary,
  isValidRegionRadius,
} from '@/lib/contractLocationFilters'
import { getGoogleMaps, getMapsApiKey, loadGoogleMaps } from '@/lib/googleMaps'
import { cn } from '@/lib/utils'
import type { ContractRegionRadius, Property } from '@/types'

const MILES_TO_METERS = 1609.344
const MIN_RADIUS_MILES = 0.5
const MAX_RADIUS_MILES = 100
const DEFAULT_RADIUS_MILES = 5
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }

interface GoogleLatLng {
  lat: () => number
  lng: () => number
}

interface GoogleMapInstance {
  setCenter: (center: { lat: number; lng: number }) => void
  fitBounds: (bounds: unknown, padding?: number) => void
}

interface GoogleCircle {
  setMap: (map: GoogleMapInstance | null) => void
  setCenter: (center: { lat: number; lng: number }) => void
  setRadius: (meters: number) => void
  getCenter: () => GoogleLatLng | null
  getRadius: () => number
  getBounds: () => unknown
}

interface GoogleMarker {
  setMap: (map: GoogleMapInstance | null) => void
  setPosition: (pos: { lat: number; lng: number }) => void
  setIcon: (icon: unknown) => void
  setTitle: (title: string) => void
}

interface GoogleMapsCtor {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance
  Circle: new (opts: Record<string, unknown>) => GoogleCircle
  Marker: new (opts: Record<string, unknown>) => GoogleMarker
  Point: new (x: number, y: number) => { x: number; y: number }
  Geocoder: new () => {
    geocode: (
      req: { address: string },
      cb: (
        results: Array<{
          formatted_address?: string
          geometry?: { location?: GoogleLatLng }
        }> | null,
        status: string
      ) => void
    ) => void
  }
  event: {
    addListener: (instance: unknown, name: string, handler: (...args: unknown[]) => void) => unknown
    clearInstanceListeners: (instance: unknown) => void
  }
}

export interface RegionMapPropertyPin {
  id: string
  address: string
  lat: number
  lng: number
}

interface RegionRadiusMapPickerProps {
  value: ContractRegionRadius | undefined
  onChange: (next: ContractRegionRadius) => void
  /** Clear the committed radius so it is not saved with the group. */
  onClear?: () => void
  /**
   * When true (default), emit a default radius once Maps is ready if `value` is empty.
   * When false, only emit after the landlord searches, clicks, or adjusts the circle.
   */
  commitOnMount?: boolean
  properties: Property[]
  className?: string
}

function clampRadiusMiles(miles: number): number {
  if (!Number.isFinite(miles)) return DEFAULT_RADIUS_MILES
  return Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, miles))
}

function propertyPins(properties: Property[]): RegionMapPropertyPin[] {
  return properties.flatMap((property) => {
    const lat = property.addressDetails?.lat
    const lng = property.addressDetails?.lng
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return []
    }
    return [{ id: property.id, address: property.address, lat, lng }]
  })
}

function defaultCenterFromPins(pins: RegionMapPropertyPin[]): { lat: number; lng: number } {
  if (pins.length === 0) return DEFAULT_CENTER
  const lat = pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length
  const lng = pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length
  return { lat, lng }
}

function pinIcon(inside: boolean, maps: GoogleMapsCtor) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: inside ? '#1f4b3a' : '#a3a3a3',
    fillOpacity: 1,
    strokeColor: '#111111',
    strokeWeight: 1.25,
    scale: 1.15,
    anchor: new maps.Point(12, 22),
  }
}

export function RegionRadiusMapPicker({
  value,
  onChange,
  onClear,
  commitOnMount = true,
  properties,
  className,
}: RegionRadiusMapPickerProps) {
  const apiKey = getMapsApiKey()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const circleRef = useRef<GoogleCircle | null>(null)
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map())
  const suppressCircleSync = useRef(false)
  const radiusRef = useRef<ContractRegionRadius | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [mapsReady, setMapsReady] = useState(false)
  const [mapsError, setMapsError] = useState('')
  const [search, setSearch] = useState('')
  const [searchError, setSearchError] = useState('')

  const pins = useMemo(() => propertyPins(properties), [properties])

  const activeRadius: ContractRegionRadius =
    value && isValidRegionRadius(value)
      ? { ...value, miles: clampRadiusMiles(value.miles) }
      : {
          ...defaultCenterFromPins(pins),
          miles: DEFAULT_RADIUS_MILES,
          label: value?.label,
        }

  radiusRef.current = activeRadius

  const matchingPins = useMemo(
    () =>
      pins.filter(
        (pin) =>
          distanceMiles(pin, { lat: activeRadius.lat, lng: activeRadius.lng }) <=
          activeRadius.miles
      ),
    [pins, activeRadius.lat, activeRadius.lng, activeRadius.miles]
  )

  const emitRadius = (next: ContractRegionRadius) => {
    onChangeRef.current({
      lat: next.lat,
      lng: next.lng,
      miles: clampRadiusMiles(next.miles),
      label: next.label?.trim() || undefined,
    })
  }

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    loadGoogleMaps(apiKey)
      .then(() => {
        if (!cancelled) setMapsReady(true)
      })
      .catch(() => {
        if (!cancelled) setMapsError('Google Maps failed to load. Check your API key.')
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  useEffect(() => {
    if (!mapsReady || !mapElRef.current || mapRef.current) return
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    if (!maps?.Map || !maps.Circle) {
      setMapsError('Google Maps Map API is unavailable.')
      return
    }

    const initial = radiusRef.current ?? {
      ...defaultCenterFromPins(pins),
      miles: DEFAULT_RADIUS_MILES,
    }
    const center = { lat: initial.lat, lng: initial.lng }
    const map = new maps.Map(mapElRef.current, {
      center,
      zoom: pins.length > 0 ? 11 : 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    })
    mapRef.current = map

    const circle = new maps.Circle({
      map,
      center,
      radius: initial.miles * MILES_TO_METERS,
      editable: true,
      draggable: true,
      strokeColor: '#1f4b3a',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: '#1f4b3a',
      fillOpacity: 0.18,
    })
    circleRef.current = circle
    const initialBounds = circle.getBounds()
    if (initialBounds) map.fitBounds(initialBounds, 48)

    // Ignore programmatic geometry events fired while the circle is first attached.
    suppressCircleSync.current = true
    const releaseSuppress = window.setTimeout(() => {
      suppressCircleSync.current = false
    }, 0)

    const syncFromCircle = () => {
      if (suppressCircleSync.current) return
      const c = circle.getCenter()
      if (!c) return
      const current = radiusRef.current
      emitRadius({
        lat: c.lat(),
        lng: c.lng(),
        miles: clampRadiusMiles(circle.getRadius() / MILES_TO_METERS),
        label: current?.label,
      })
    }

    maps.event.addListener(circle, 'center_changed', syncFromCircle)
    maps.event.addListener(circle, 'radius_changed', syncFromCircle)
    maps.event.addListener(map, 'click', (...args: unknown[]) => {
      const e = args[0] as { latLng?: GoogleLatLng } | undefined
      const latLng = e?.latLng
      if (!latLng) return
      const current = radiusRef.current
      emitRadius({
        lat: latLng.lat(),
        lng: latLng.lng(),
        miles: current?.miles ?? DEFAULT_RADIUS_MILES,
        label: undefined,
      })
    })

    if (commitOnMount && !isValidRegionRadius(value)) {
      emitRadius(initial)
    }

    return () => {
      window.clearTimeout(releaseSuppress)
      maps.event.clearInstanceListeners(circle)
      maps.event.clearInstanceListeners(map)
      circle.setMap(null)
      circleRef.current = null
      for (const marker of markersRef.current.values()) {
        marker.setMap(null)
      }
      markersRef.current.clear()
      mapRef.current = null
    }
    // Mount once when Maps is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady])

  useEffect(() => {
    const circle = circleRef.current
    if (!circle) return
    suppressCircleSync.current = true
    circle.setCenter({ lat: activeRadius.lat, lng: activeRadius.lng })
    circle.setRadius(activeRadius.miles * MILES_TO_METERS)
    const t = window.setTimeout(() => {
      suppressCircleSync.current = false
    }, 0)
    return () => window.clearTimeout(t)
  }, [activeRadius.lat, activeRadius.lng, activeRadius.miles])

  useEffect(() => {
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    const map = mapRef.current
    if (!maps?.Marker || !maps.Point || !map) return

    const seen = new Set<string>()
    for (const pin of pins) {
      seen.add(pin.id)
      const inside =
        distanceMiles(pin, { lat: activeRadius.lat, lng: activeRadius.lng }) <=
        activeRadius.miles
      let marker = markersRef.current.get(pin.id)
      if (!marker) {
        marker = new maps.Marker({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          title: pin.address,
          icon: pinIcon(inside, maps),
        })
        markersRef.current.set(pin.id, marker)
      } else {
        marker.setPosition({ lat: pin.lat, lng: pin.lng })
        marker.setIcon(pinIcon(inside, maps))
        marker.setTitle(pin.address)
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
      }
    }
  }, [pins, activeRadius.lat, activeRadius.lng, activeRadius.miles, mapsReady])

  const handleSearchCenter = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchError('')
    const query = search.trim()
    if (!query) {
      setSearchError('Enter a city, address, or place to center the radius.')
      return
    }
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    if (!maps?.Geocoder) {
      setSearchError('Maps geocoder is not ready yet.')
      return
    }

    const geocoder = new maps.Geocoder()
    geocoder.geocode({ address: query }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        setSearchError('No matching place found. Try a different search.')
        return
      }
      const place = results[0]
      const loc = place.geometry!.location!
      const next = {
        lat: loc.lat(),
        lng: loc.lng(),
        miles: radiusRef.current?.miles ?? DEFAULT_RADIUS_MILES,
        label: place.formatted_address || query,
      }
      emitRadius(next)
      const map = mapRef.current
      const circle = circleRef.current
      if (map && circle) {
        // Apply immediately so fitBounds uses the new geometry
        suppressCircleSync.current = true
        circle.setCenter({ lat: next.lat, lng: next.lng })
        circle.setRadius(next.miles * MILES_TO_METERS)
        const bounds = circle.getBounds()
        if (bounds) map.fitBounds(bounds, 48)
        else map.setCenter({ lat: next.lat, lng: next.lng })
        window.setTimeout(() => {
          suppressCircleSync.current = false
        }, 0)
      }
    })
  }

  if (!apiKey) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-sm)] border-2 border-dashed border-line bg-surface-paper p-4 text-sm text-ink-muted',
          className
        )}
      >
        <p className="font-medium text-ink">Map radius requires Google Maps</p>
        <p className="mt-1">
          Add <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> (Maps JavaScript API) to
          draw a radius on the map. Area codes and states still work without a key.
        </p>
      </div>
    )
  }

  const radiusCommitted = Boolean(value && isValidRegionRadius(value))
  const radiusLabel = formatRegionRadiusSummary({
    ...activeRadius,
    label: undefined,
  })

  return (
    <div className={cn('space-y-3', className)}>
      <form onSubmit={handleSearchCenter} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Center on place"
          hint="Search a city or address, click the map, or drag the circle"
          placeholder="e.g. Pittsburgh, PA"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper px-3 text-xs font-semibold uppercase tracking-caps text-ink shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] hover:border-brand"
        >
          <Search className="h-3.5 w-3.5" />
          Center
        </button>
      </form>
      {(searchError || mapsError) && (
        <p className="text-sm text-accent">{searchError || mapsError}</p>
      )}

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="group-radius-miles" className="text-xs font-semibold text-ink">
            Radius: {radiusLabel}
          </label>
          {radiusCommitted && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Remove from group
            </button>
          ) : null}
        </div>
        <input
          id="group-radius-miles"
          type="range"
          min={MIN_RADIUS_MILES}
          max={MAX_RADIUS_MILES}
          step={0.5}
          value={activeRadius.miles}
          onChange={(e) =>
            emitRadius({ ...activeRadius, miles: clampRadiusMiles(Number(e.target.value)) })
          }
          className="w-full accent-[var(--brand)]"
        />
        <p className="text-xs text-ink-faint">
          {radiusCommitted
            ? 'Drag the circle handles to resize, or drag the circle to move it. Rentals inside the highlighted area show in brand green.'
            : 'Search, click the map, or adjust the slider to include this radius in the group. Preview pins update as you explore.'}
        </p>
      </div>

      <div
        ref={mapElRef}
        className="h-64 w-full overflow-hidden rounded-[var(--radius-sm)] border-2 border-ink bg-[color-mix(in_srgb,var(--line)_28%,var(--surface))] sm:h-80"
        role="application"
        aria-label="Group map radius"
      />

      <div className="rounded-[var(--radius-sm)] border-2 border-line p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-caps text-ink-faint">
          <MapPin className="h-3.5 w-3.5" />
          Rentals in radius
          {!radiusCommitted ? (
            <span className="normal-case tracking-normal text-ink-faint">(preview)</span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-ink">
          {pins.length === 0 ? (
            <>
              No rentals have map coordinates yet. Confirm addresses with Places autocomplete when
              adding rentals so they appear here and match this filter.
            </>
          ) : (
            <>
              <span className="font-semibold">{matchingPins.length}</span> of {pins.length} mapped
              rental{pins.length === 1 ? '' : 's'} inside this circle
              {activeRadius.label ? (
                <>
                  {' '}
                  · centered on <span className="font-medium">{activeRadius.label}</span>
                </>
              ) : null}
            </>
          )}
        </p>
        {matchingPins.length > 0 && (
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-ink-muted">
            {matchingPins.slice(0, 12).map((pin) => (
              <li key={pin.id} className="truncate">
                {pin.address}
              </li>
            ))}
            {matchingPins.length > 12 && (
              <li className="text-ink-faint">+{matchingPins.length - 12} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
