import { useEffect, useId, useRef, useState } from 'react'
import { FormLabel } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'
import type { PropertyAddressDetails } from '@/types'

export interface ConfirmedAddress {
  address: string
  details: PropertyAddressDetails
  confirmed: true
}

interface AddressSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface AddressAutocompleteProps {
  label?: string
  name?: string
  required?: boolean
  value: string
  confirmed: boolean
  error?: string
  placeholder?: string
  onChange: (next: { address: string; confirmed: boolean; details?: PropertyAddressDetails }) => void
  className?: string
}

interface PlacesPrediction {
  place_id: string
  description: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
}

interface PlaceDetailsResult {
  formatted_address?: string
  place_id?: string
  geometry?: { location?: { lat: () => number; lng: () => number } }
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

/** Minimal Places surface used by AddressAutocomplete (avoids @types/google.maps dep). */
interface GooglePlacesApi {
  AutocompleteService: { new (): { getPlacePredictions: (...args: unknown[]) => void } }
  PlacesService: {
    new (attrContainer: HTMLElement): { getDetails: (...args: unknown[]) => void }
  }
  PlacesServiceStatus: { OK: string; ZERO_RESULTS: string }
}

function getGooglePlaces(): GooglePlacesApi | undefined {
  const google = (window as Window & { google?: { maps?: { places?: GooglePlacesApi } } }).google
  return google?.maps?.places
}

const GOOGLE_MAPS_SCRIPT_ID = 'leased-google-maps-places'

function getMapsApiKey(): string {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (getGooglePlaces()) return Promise.resolve()

  const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      if (getGooglePlaces()) {
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

function componentLong(
  components: PlaceDetailsResult['address_components'],
  type: string
): string | undefined {
  const match = components?.find((c) => c.types.includes(type))
  return match?.long_name
}

function componentShort(
  components: PlaceDetailsResult['address_components'],
  type: string
): string | undefined {
  const match = components?.find((c) => c.types.includes(type))
  return match?.short_name
}

function buildAddressDetails(
  place: PlaceDetailsResult,
  fallbackDescription: string
): ConfirmedAddress {
  const streetNumber = componentLong(place.address_components, 'street_number')
  const route = componentLong(place.address_components, 'route')
  const street = [streetNumber, route].filter(Boolean).join(' ').trim() || undefined
  const city =
    componentLong(place.address_components, 'locality') ||
    componentLong(place.address_components, 'sublocality') ||
    componentLong(place.address_components, 'postal_town')
  const state = componentShort(place.address_components, 'administrative_area_level_1')
  const zip = componentLong(place.address_components, 'postal_code')
  const country = componentShort(place.address_components, 'country')
  const lat = place.geometry?.location?.lat()
  const lng = place.geometry?.location?.lng()

  return {
    address: place.formatted_address?.trim() || fallbackDescription,
    confirmed: true,
    details: {
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(zip ? { zip } : {}),
      ...(country ? { country } : {}),
      ...(place.place_id ? { placeId: place.place_id } : {}),
      ...(typeof lat === 'number' && Number.isFinite(lat) ? { lat } : {}),
      ...(typeof lng === 'number' && Number.isFinite(lng) ? { lng } : {}),
    },
  }
}

/**
 * Property Address field with Google Places Autocomplete when
 * VITE_GOOGLE_MAPS_API_KEY is set. Requires selecting a suggestion
 * (or confirming the typed address when Places is unavailable).
 */
export function AddressAutocomplete({
  label = 'Property Address',
  name = 'address',
  required,
  value,
  confirmed,
  error,
  placeholder = 'Start typing an address…',
  onChange,
  className,
}: AddressAutocompleteProps) {
  const fieldId = useId()
  const listId = `${fieldId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const placesAttrRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const apiKey = getMapsApiKey()

  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [placesReady, setPlacesReady] = useState(false)
  const [placesError, setPlacesError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (!cancelled) setPlacesReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setPlacesError('Address suggestions are temporarily unavailable.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const query = value.trim()
    if (!placesReady || !query || query.length < 3) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = window.setTimeout(() => {
      const places = getGooglePlaces()
      if (!places) {
        setLoading(false)
        return
      }
      const service = new places.AutocompleteService()
      service.getPlacePredictions(
        {
          input: query,
          types: ['address'],
          componentRestrictions: { country: 'us' },
        },
        (predictions: PlacesPrediction[] | null, status: string) => {
          setLoading(false)
          if (status !== places.PlacesServiceStatus.OK || !predictions) {
            setSuggestions([])
            return
          }
          setSuggestions(
            predictions.map((prediction) => ({
              placeId: prediction.place_id,
              description: prediction.description,
              mainText: prediction.structured_formatting?.main_text || prediction.description,
              secondaryText: prediction.structured_formatting?.secondary_text || '',
            }))
          )
          setHighlight(0)
          setOpen(true)
        }
      )
    }, 220)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [value, placesReady])

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    const places = getGooglePlaces()
    const attr = placesAttrRef.current
    if (!places || !attr) {
      onChange({
        address: suggestion.description,
        confirmed: true,
        details: { placeId: suggestion.placeId },
      })
      setOpen(false)
      setSuggestions([])
      return
    }

    const service = new places.PlacesService(attr)
    service.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ['formatted_address', 'address_components', 'geometry', 'place_id'],
      },
      (place: PlaceDetailsResult | null, status: string) => {
        if (status !== places.PlacesServiceStatus.OK || !place) {
          onChange({
            address: suggestion.description,
            confirmed: true,
            details: { placeId: suggestion.placeId },
          })
        } else {
          const confirmedAddress = buildAddressDetails(place, suggestion.description)
          onChange({
            address: confirmedAddress.address,
            confirmed: true,
            details: confirmedAddress.details,
          })
        }
        setOpen(false)
        setSuggestions([])
      }
    )
  }

  const confirmTypedAddress = () => {
    const trimmed = value.trim()
    if (!trimmed || !/\d/.test(trimmed)) return
    onChange({
      address: trimmed,
      confirmed: true,
      details: {},
    })
    setOpen(false)
  }

  const showManualConfirm =
    Boolean(value.trim()) &&
    !confirmed &&
    (!apiKey ||
      !placesReady ||
      Boolean(placesError) ||
      (placesReady && !loading && value.trim().length >= 3 && suggestions.length === 0))

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <FormLabel label={label} htmlFor={fieldId} required={required} />
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && suggestions[highlight] ? `${listId}-option-${highlight}` : undefined
          }
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            'w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0',
            error && 'border-accent focus:border-accent',
            confirmed && 'border-brand/40'
          )}
          onChange={(event) => {
            onChange({
              address: event.target.value,
              confirmed: false,
              details: undefined,
            })
            setOpen(true)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              if (suggestions.length > 0) setOpen(true)
              return
            }
            if (event.key === 'Escape') {
              setOpen(false)
              return
            }
            if (event.key === 'ArrowDown' && suggestions.length > 0) {
              event.preventDefault()
              setHighlight((prev) => (prev + 1) % suggestions.length)
              return
            }
            if (event.key === 'ArrowUp' && suggestions.length > 0) {
              event.preventDefault()
              setHighlight((prev) => (prev - 1 + suggestions.length) % suggestions.length)
              return
            }
            if (event.key === 'Enter' && open && suggestions[highlight]) {
              event.preventDefault()
              selectSuggestion(suggestions[highlight])
            }
          }}
        />
      </div>

      <div ref={placesAttrRef} className="hidden" aria-hidden />

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/15 bg-surface-paper py-1 shadow-lift"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="presentation">
              <button
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === highlight}
                className={cn(
                  'flex w-full flex-col px-3 py-2 text-left text-sm transition-colors',
                  index === highlight ? 'bg-brand/10 text-ink' : 'text-ink hover:bg-surface'
                )}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="font-medium leading-snug">{suggestion.mainText}</span>
                {suggestion.secondaryText ? (
                  <span className="text-xs text-ink-muted">{suggestion.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? (
        <p className="mt-1.5 text-xs text-ink-faint">Searching addresses…</p>
      ) : null}

      {confirmed ? (
        <p className="mt-1.5 text-xs font-medium text-brand">Address confirmed</p>
      ) : null}

      {showManualConfirm ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-ink-muted">
            {!apiKey
              ? 'Add VITE_GOOGLE_MAPS_API_KEY for address suggestions, or confirm the address you typed.'
              : placesError
                ? placesError
                : suggestions.length === 0
                  ? 'No matching suggestions. Confirm the address if it is correct.'
                  : 'Select a suggestion above, or confirm the address you typed.'}
          </p>
          <button
            type="button"
            onClick={confirmTypedAddress}
            className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface"
          >
            Confirm address
          </button>
        </div>
      ) : null}

      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
