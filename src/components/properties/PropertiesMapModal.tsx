import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPinned, MousePointer2, Radius } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import {
  distanceMiles,
  formatRegionRadiusSummary,
  isValidRegionRadius,
} from '@/lib/contractLocationFilters'
import { resolvePropertyCoordinates } from '@/lib/geocodeAddress'
import { getGoogleMaps, getMapsApiKey, loadGoogleMaps } from '@/lib/googleMaps'
import { generateId } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { ContractRegion, ContractRegionRadius, Property } from '@/types'

const MILES_TO_METERS = 1609.344
const MIN_RADIUS_MILES = 0.5
const MAX_RADIUS_MILES = 500
const DEFAULT_RADIUS_MILES = 50
const US_CENTER = { lat: 39.8283, lng: -98.5795 }
const US_BOUNDS = {
  north: 49.4,
  south: 24.4,
  west: -125.0,
  east: -66.9,
}

interface GoogleLatLng {
  lat: () => number
  lng: () => number
}

interface GoogleMapInstance {
  setCenter: (center: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
  getZoom?: () => number | undefined
  fitBounds: (bounds: unknown, padding?: number | Record<string, number>) => void
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
  setZIndex: (z: number) => void
}

interface GoogleMapsCtor {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance
  Circle: new (opts: Record<string, unknown>) => GoogleCircle
  Marker: new (opts: Record<string, unknown>) => GoogleMarker
  LatLngBounds: new (
    sw?: { lat: number; lng: number },
    ne?: { lat: number; lng: number }
  ) => {
    extend: (point: { lat: number; lng: number }) => void
    isEmpty?: () => boolean
  }
  Point: new (x: number, y: number) => { x: number; y: number }
  event: {
    addListener: (
      instance: unknown,
      name: string,
      handler: (...args: unknown[]) => void
    ) => unknown
    clearInstanceListeners: (instance: unknown) => void
  }
}

export interface MapPropertyPin {
  id: string
  address: string
  lat: number
  lng: number
}

type DefineMode = 'select' | 'radius'

interface PropertiesMapModalProps {
  open: boolean
  onClose: () => void
  properties: Property[]
  /** Called after a group is saved so the page can select/filter it. */
  onGroupSaved?: (groupId: string) => void
}

function clampRadiusMiles(miles: number): number {
  if (!Number.isFinite(miles)) return DEFAULT_RADIUS_MILES
  return Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, miles))
}

function pinIcon(selected: boolean, maps: GoogleMapsCtor) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: selected ? '#1f4b3a' : '#737373',
    fillOpacity: 1,
    strokeColor: '#111111',
    strokeWeight: 1.25,
    scale: selected ? 1.35 : 1.15,
    anchor: new maps.Point(12, 22),
  }
}

function fitMapToPortfolio(
  map: GoogleMapInstance,
  maps: GoogleMapsCtor,
  pins: MapPropertyPin[]
) {
  const bounds = new maps.LatLngBounds(
    { lat: US_BOUNDS.south, lng: US_BOUNDS.west },
    { lat: US_BOUNDS.north, lng: US_BOUNDS.east }
  )
  for (const pin of pins) {
    bounds.extend({ lat: pin.lat, lng: pin.lng })
  }
  map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
  // Keep a continental overview when the portfolio is tightly clustered.
  window.setTimeout(() => {
    const zoom = map.getZoom?.()
    if (typeof zoom === 'number' && zoom > 6 && pins.length > 0) {
      map.setZoom(5)
      if (pins.length === 1) {
        map.setCenter({ lat: pins[0].lat, lng: pins[0].lng })
      } else {
        map.setCenter(US_CENTER)
      }
    }
  }, 0)
}

export function PropertiesMapModal({
  open,
  onClose,
  properties,
  onGroupSaved,
}: PropertiesMapModalProps) {
  const { settings, updateSettings } = useApp()
  const apiKey = getMapsApiKey()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const circleRef = useRef<GoogleCircle | null>(null)
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map())
  const clickHandlersRef = useRef<Map<string, unknown>>(new Map())
  const suppressCircleSync = useRef(false)

  const definingRef = useRef(false)
  const defineModeRef = useRef<DefineMode>('select')
  const selectedIdsRef = useRef<Set<string>>(new Set())
  const radiusRef = useRef<ContractRegionRadius | null>(null)
  const pinsRef = useRef<MapPropertyPin[]>([])

  const [mapsReady, setMapsReady] = useState(false)
  const [mapsError, setMapsError] = useState('')
  const [pins, setPins] = useState<MapPropertyPin[]>([])
  const [pinsLoading, setPinsLoading] = useState(false)
  const [defining, setDefining] = useState(false)
  const [defineMode, setDefineMode] = useState<DefineMode>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [radius, setRadius] = useState<ContractRegionRadius | undefined>()
  const [groupName, setGroupName] = useState('')
  const [saveError, setSaveError] = useState('')
  const [radiusSearch, setRadiusSearch] = useState('')
  const [radiusSearchError, setRadiusSearchError] = useState('')

  definingRef.current = defining
  defineModeRef.current = defineMode
  selectedIdsRef.current = selectedIds
  radiusRef.current = radius && isValidRegionRadius(radius) ? radius : null
  pinsRef.current = pins

  const resetDefineState = () => {
    setDefining(false)
    setDefineMode('select')
    setSelectedIds(new Set())
    setRadius(undefined)
    setGroupName('')
    setSaveError('')
    setRadiusSearch('')
    setRadiusSearchError('')
  }

  useEffect(() => {
    if (!open) {
      resetDefineState()
      setPins([])
      setMapsReady(false)
      setMapsError('')
      setPinsLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !apiKey) return
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
  }, [open, apiKey])

  useEffect(() => {
    if (!open || !mapsReady) return
    let cancelled = false
    setPinsLoading(true)
    ;(async () => {
      const resolved = await Promise.all(
        properties.map(async (property) => {
          const point = await resolvePropertyCoordinates(property)
          if (!point) return null
          return {
            id: property.id,
            address: property.address,
            lat: point.lat,
            lng: point.lng,
          } satisfies MapPropertyPin
        })
      )
      if (cancelled) return
      setPins(resolved.filter((pin): pin is MapPropertyPin => Boolean(pin)))
      setPinsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, mapsReady, properties])

  const highlightedIds = useMemo(() => {
    if (!defining) return new Set<string>()
    if (defineMode === 'select') return selectedIds
    if (!radius || !isValidRegionRadius(radius)) return new Set<string>()
    return new Set(
      pins
        .filter(
          (pin) =>
            distanceMiles(pin, { lat: radius.lat, lng: radius.lng }) <= radius.miles
        )
        .map((pin) => pin.id)
    )
  }, [defining, defineMode, selectedIds, radius, pins])

  const emitRadius = (next: ContractRegionRadius) => {
    setRadius({
      lat: next.lat,
      lng: next.lng,
      miles: clampRadiusMiles(next.miles),
      label: next.label?.trim() || undefined,
    })
  }

  // Mount map once Maps is ready and the dialog is open.
  useEffect(() => {
    if (!open || !mapsReady || !mapElRef.current || mapRef.current) return
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    if (!maps?.Map || !maps.LatLngBounds) {
      setMapsError('Google Maps Map API is unavailable.')
      return
    }

    const map = new maps.Map(mapElRef.current, {
      center: US_CENTER,
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    })
    mapRef.current = map
    fitMapToPortfolio(map, maps, pinsRef.current)

    maps.event.addListener(map, 'click', (...args: unknown[]) => {
      if (!definingRef.current || defineModeRef.current !== 'radius') return
      const e = args[0] as { latLng?: GoogleLatLng } | undefined
      const latLng = e?.latLng
      if (!latLng) return
      emitRadius({
        lat: latLng.lat(),
        lng: latLng.lng(),
        miles: radiusRef.current?.miles ?? DEFAULT_RADIUS_MILES,
        label: undefined,
      })
    })

    return () => {
      if (circleRef.current) {
        maps.event.clearInstanceListeners(circleRef.current)
        circleRef.current.setMap(null)
        circleRef.current = null
      }
      for (const marker of markersRef.current.values()) {
        maps.event.clearInstanceListeners(marker)
        marker.setMap(null)
      }
      markersRef.current.clear()
      clickHandlersRef.current.clear()
      maps.event.clearInstanceListeners(map)
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapsReady])

  // Fit to continental US + pins when pins resolve after mount.
  useEffect(() => {
    const map = mapRef.current
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    if (!map || !maps?.LatLngBounds || !open || defining) return
    fitMapToPortfolio(map, maps, pins)
  }, [pins, open, defining])

  // Sync radius circle while defining in radius mode.
  useEffect(() => {
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    const map = mapRef.current
    if (!maps?.Circle || !map) return

    if (!defining || defineMode !== 'radius') {
      if (circleRef.current) {
        maps.event.clearInstanceListeners(circleRef.current)
        circleRef.current.setMap(null)
        circleRef.current = null
      }
      return
    }

    const active: ContractRegionRadius =
      radius && isValidRegionRadius(radius)
        ? { ...radius, miles: clampRadiusMiles(radius.miles) }
        : { ...US_CENTER, miles: DEFAULT_RADIUS_MILES }

    if (!circleRef.current) {
      const circle = new maps.Circle({
        map,
        center: { lat: active.lat, lng: active.lng },
        radius: active.miles * MILES_TO_METERS,
        editable: true,
        draggable: true,
        strokeColor: '#1f4b3a',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: '#1f4b3a',
        fillOpacity: 0.18,
      })
      circleRef.current = circle

      const syncFromCircle = () => {
        if (suppressCircleSync.current) return
        const c = circle.getCenter()
        if (!c) return
        emitRadius({
          lat: c.lat(),
          lng: c.lng(),
          miles: clampRadiusMiles(circle.getRadius() / MILES_TO_METERS),
          label: radiusRef.current?.label,
        })
      }
      maps.event.addListener(circle, 'center_changed', syncFromCircle)
      maps.event.addListener(circle, 'radius_changed', syncFromCircle)

      if (!radius || !isValidRegionRadius(radius)) {
        emitRadius(active)
      }
      const bounds = circle.getBounds()
      if (bounds) map.fitBounds(bounds, 48)
    } else {
      suppressCircleSync.current = true
      circleRef.current.setCenter({ lat: active.lat, lng: active.lng })
      circleRef.current.setRadius(active.miles * MILES_TO_METERS)
      window.setTimeout(() => {
        suppressCircleSync.current = false
      }, 0)
    }
  }, [defining, defineMode, radius])

  // Sync property markers + click-to-select.
  useEffect(() => {
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    const map = mapRef.current
    if (!maps?.Marker || !maps.Point || !map) return

    const seen = new Set<string>()
    for (const pin of pins) {
      seen.add(pin.id)
      const selected = highlightedIds.has(pin.id)
      let marker = markersRef.current.get(pin.id)
      if (!marker) {
        marker = new maps.Marker({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          title: pin.address,
          icon: pinIcon(selected, maps),
          zIndex: selected ? 2 : 1,
        })
        markersRef.current.set(pin.id, marker)
        const handler = maps.event.addListener(marker, 'click', () => {
          if (!definingRef.current || defineModeRef.current !== 'select') return
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(pin.id)) next.delete(pin.id)
            else next.add(pin.id)
            return next
          })
        })
        clickHandlersRef.current.set(pin.id, handler)
      } else {
        marker.setPosition({ lat: pin.lat, lng: pin.lng })
        marker.setIcon(pinIcon(selected, maps))
        marker.setTitle(pin.address)
        marker.setZIndex(selected ? 2 : 1)
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        maps.event.clearInstanceListeners(marker)
        marker.setMap(null)
        markersRef.current.delete(id)
        clickHandlersRef.current.delete(id)
      }
    }
  }, [pins, highlightedIds, mapsReady, open])

  const handleRadiusSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setRadiusSearchError('')
    const query = radiusSearch.trim()
    if (!query) {
      setRadiusSearchError('Enter a city, address, or place to center the radius.')
      return
    }
    const maps = getGoogleMaps() as GoogleMapsCtor | undefined
    if (!maps) {
      setRadiusSearchError('Maps geocoder is not ready yet.')
      return
    }
    void resolvePropertyCoordinates({
      id: 'search',
      address: query,
    }).then((point) => {
      if (!point) {
        setRadiusSearchError('No matching place found. Try a different search.')
        return
      }
      const next = {
        lat: point.lat,
        lng: point.lng,
        miles: radiusRef.current?.miles ?? DEFAULT_RADIUS_MILES,
        label: point.label,
      }
      emitRadius(next)
      const map = mapRef.current
      const circle = circleRef.current
      if (map && circle) {
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

  const handleSaveGroup = () => {
    const trimmed = groupName.trim()
    if (!trimmed) {
      setSaveError('Group name is required.')
      return
    }

    let nextGroup: ContractRegion
    if (defineMode === 'select') {
      if (selectedIds.size === 0) {
        setSaveError('Click one or more properties on the map to include them.')
        return
      }
      nextGroup = {
        id: generateId(),
        name: trimmed,
        areaCodes: [],
        states: [],
        propertyIds: [...selectedIds],
      }
    } else {
      if (!radius || !isValidRegionRadius(radius)) {
        setSaveError('Set a map radius by searching, clicking the map, or dragging the circle.')
        return
      }
      nextGroup = {
        id: generateId(),
        name: trimmed,
        areaCodes: [],
        states: [],
        radius: {
          lat: radius.lat,
          lng: radius.lng,
          miles: clampRadiusMiles(radius.miles),
          label: radius.label,
        },
      }
    }

    const existing = settings.contractRegions ?? []
    updateSettings({ contractRegions: [...existing, nextGroup] })
    onGroupSaved?.(nextGroup.id)
    resetDefineState()
  }

  const matchingCount = highlightedIds.size
  const unmappedCount = properties.length - pins.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rental Map"
      size="full"
      mobileCover
      headerActions={
        defining ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetDefineState}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setDefining(true)
              setSaveError('')
            }}
            disabled={!apiKey || Boolean(mapsError)}
          >
            <MapPinned className="h-3.5 w-3.5" />
            Define Group
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {!apiKey ? (
          <div className="rounded-[var(--radius-sm)] border-2 border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
            <p className="font-medium text-ink">Google Maps is required</p>
            <p className="mt-1">
              Add <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to view your
              portfolio on a map and define groups by selection or radius.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm text-ink-muted">
                {pinsLoading
                  ? 'Locating rentals…'
                  : `Showing ${pins.length} of ${properties.length} rentals across the U.S.`}
                {unmappedCount > 0 && !pinsLoading
                  ? ` · ${unmappedCount} need a confirmable address for a pin`
                  : ''}
              </p>
              {defining ? (
                <p className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
                  {matchingCount}{' '}
                  {matchingCount === 1 ? 'rental' : 'rentals'} in group
                </p>
              ) : null}
            </div>

            {defining ? (
              <div className="space-y-3 rounded-[var(--radius-sm)] border-2 border-line bg-surface-paper p-3 sm:p-4">
                <div
                  role="group"
                  aria-label="How to define this group"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]"
                >
                  <button
                    type="button"
                    onClick={() => setDefineMode('select')}
                    aria-pressed={defineMode === 'select'}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2.5 text-[10px] font-semibold uppercase tracking-caps transition-colors',
                      defineMode === 'select'
                        ? 'bg-brand text-surface-paper'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                    )}
                  >
                    <MousePointer2 className="h-3 w-3" aria-hidden />
                    Click properties
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefineMode('radius')}
                    aria-pressed={defineMode === 'radius'}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2.5 text-[10px] font-semibold uppercase tracking-caps transition-colors',
                      defineMode === 'radius'
                        ? 'bg-brand text-surface-paper'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                    )}
                  >
                    <Radius className="h-3 w-3" aria-hidden />
                    Set radius
                  </button>
                </div>

                {defineMode === 'select' ? (
                  <p className="text-sm text-ink-muted">
                    Click pins on the map to include or exclude rentals. Selected pins
                    turn green.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-ink-muted">
                      Search a place, click the map, or drag the circle. Rentals inside
                      the radius join the group.
                      {radius && isValidRegionRadius(radius)
                        ? ` Currently ${formatRegionRadiusSummary(radius)}.`
                        : ''}
                    </p>
                    <form
                      onSubmit={handleRadiusSearch}
                      className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    >
                      <Input
                        label="Center on place"
                        placeholder="e.g. Pittsburgh, PA"
                        value={radiusSearch}
                        onChange={(e) => setRadiusSearch(e.target.value)}
                        className="min-w-0 flex-1"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Center
                      </Button>
                    </form>
                    {radiusSearchError ? (
                      <p className="text-xs text-accent" role="alert">
                        {radiusSearchError}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Input
                    label="Group name"
                    required
                    placeholder="e.g. Tri-State Properties"
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value)
                      setSaveError('')
                    }}
                    className="min-w-0 flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleSaveGroup}>
                    Save Group
                  </Button>
                </div>
                {saveError ? (
                  <p className="text-sm text-accent" role="alert">
                    {saveError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {mapsError ? (
              <p className="text-sm text-accent" role="alert">
                {mapsError}
              </p>
            ) : (
              <div className="relative overflow-hidden rounded-[var(--radius-sm)] border-2 border-ink bg-surface shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]">
                <div
                  ref={mapElRef}
                  className="h-[min(70vh,36rem)] w-full min-h-[16rem]"
                  role="presentation"
                  aria-label="Interactive map of all rentals"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
