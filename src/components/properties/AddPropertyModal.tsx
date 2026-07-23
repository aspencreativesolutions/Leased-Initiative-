import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { AddressAutocomplete } from '@/components/properties/AddressAutocomplete'
import { Button } from '@/components/ui/Button'
import { FormLabel, Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { useApp } from '@/context/AppContext'
import {
  RENTAL_TYPE_OPTIONS,
  rentalTypeShowsUnitCount,
  suggestedUnitCount,
} from '@/lib/rentalTypes'
import { cn } from '@/lib/utils'
import type { PropertyAddressDetails, PropertyHousingType } from '@/types'

interface AddPropertyModalProps {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

interface FieldErrors {
  address?: string
  propertyType?: string
  bedrooms?: string
  maxTenants?: string
  unitCount?: string
}

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

export function AddPropertyModal({ open, onClose, onAdded }: AddPropertyModalProps) {
  const { addProperty } = useApp()
  const rentalTypeListId = useId()
  const rentalTypeRef = useRef<HTMLDivElement>(null)
  const [address, setAddress] = useState('')
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [addressDetails, setAddressDetails] = useState<PropertyAddressDetails | undefined>()
  const [propertyType, setPropertyType] = useState<PropertyHousingType | ''>('')
  const [rentalTypeOpen, setRentalTypeOpen] = useState(false)
  const [rentalTypeHighlight, setRentalTypeHighlight] = useState(0)
  const [bedrooms, setBedrooms] = useState('')
  const [maxTenants, setMaxTenants] = useState('')
  const [unitCount, setUnitCount] = useState('1')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const showUnitCount = propertyType ? rentalTypeShowsUnitCount(propertyType) : false

  useEffect(() => {
    if (!propertyType) return
    setUnitCount(String(suggestedUnitCount(propertyType)))
  }, [propertyType])

  useEffect(() => {
    if (!rentalTypeOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rentalTypeRef.current?.contains(event.target as Node)) {
        setRentalTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [rentalTypeOpen])

  const reset = () => {
    setAddress('')
    setAddressConfirmed(false)
    setAddressDetails(undefined)
    setPropertyType('')
    setRentalTypeOpen(false)
    setRentalTypeHighlight(0)
    setBedrooms('')
    setMaxTenants('')
    setUnitCount('1')
    setFieldErrors({})
    setError('')
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      next.address = 'Address cannot be blank'
    } else if (!addressConfirmed) {
      next.address = 'Select or confirm a valid address before saving'
    }

    if (!propertyType) {
      next.propertyType = 'Select a rental type'
    }

    const beds = parseNonNegativeInt(bedrooms)
    if (bedrooms.trim() === '') {
      next.bedrooms = 'Enter the number of bedrooms'
    } else if (beds === null) {
      next.bedrooms = 'Bedrooms must be a whole number (no letters or decimals)'
    } else if (beds < 0) {
      next.bedrooms = 'Bedrooms must be zero or greater'
    }

    const capacity = parseNonNegativeInt(maxTenants)
    if (maxTenants.trim() === '') {
      next.maxTenants = 'Enter the maximum tenants allowed'
    } else if (capacity === null) {
      next.maxTenants = 'Maximum tenants must be a whole number (no letters or decimals)'
    } else if (capacity < 1) {
      next.maxTenants = 'Maximum tenant capacity must be at least 1'
    }

    if (showUnitCount) {
      const units = parseNonNegativeInt(unitCount)
      if (unitCount.trim() === '') {
        next.unitCount = 'Enter the number of units'
      } else if (units === null) {
        next.unitCount = 'Number of units must be a whole number'
      } else if (units < 1) {
        next.unitCount = 'Number of units must be at least 1'
      }
    }

    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const nextErrors = validate()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const beds = parseNonNegativeInt(bedrooms)
    const capacity = parseNonNegativeInt(maxTenants)
    const units = showUnitCount ? parseNonNegativeInt(unitCount) : 1
    if (beds === null || capacity === null || units === null || !propertyType) return

    setSubmitting(true)
    try {
      await addProperty({
        address: address.trim(),
        propertyType,
        bedrooms: beds,
        maxTenants: capacity,
        unitCount: units,
        addressConfirmed: true,
        addressDetails,
      })
      reset()
      onAdded?.()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add rental')
      setSubmitting(false)
    }
  }

  const selectedRentalOption = RENTAL_TYPE_OPTIONS.find((option) => option.value === propertyType)

  return (
    <Modal open={open} onClose={handleClose} title="Add Rental" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-muted">
          Add a rental to your portfolio. It appears on the Rentals page, in Upcoming Openings,
          and in the property list tenants choose at signup.
        </p>

        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <AddressAutocomplete
          label="Property Address"
          name="address"
          value={address}
          confirmed={addressConfirmed}
          required
          error={fieldErrors.address}
          onChange={({ address: nextAddress, confirmed, details }) => {
            setAddress(nextAddress)
            setAddressConfirmed(confirmed)
            setAddressDetails(details)
            if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }))
          }}
        />

        <div ref={rentalTypeRef} className="relative">
          <FormLabel label="Rental Type" htmlFor={rentalTypeListId} required />
          <button
            id={rentalTypeListId}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={rentalTypeOpen}
            aria-controls={`${rentalTypeListId}-options`}
            className={cn(
              'flex w-full flex-col rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-2.5 text-left text-sm text-ink focus:border-ink focus:outline-none',
              fieldErrors.propertyType && 'border-accent'
            )}
            onClick={() => setRentalTypeOpen((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setRentalTypeOpen(true)
                setRentalTypeHighlight(0)
              }
              if (event.key === 'Escape') setRentalTypeOpen(false)
              if (event.key === 'Enter' && rentalTypeOpen) {
                event.preventDefault()
                const option = RENTAL_TYPE_OPTIONS[rentalTypeHighlight]
                if (option) {
                  setPropertyType(option.value)
                  setRentalTypeOpen(false)
                  if (fieldErrors.propertyType) {
                    setFieldErrors((prev) => ({ ...prev, propertyType: undefined }))
                  }
                }
              }
              if (event.key === 'ArrowDown' && rentalTypeOpen) {
                event.preventDefault()
                setRentalTypeHighlight((prev) => (prev + 1) % RENTAL_TYPE_OPTIONS.length)
              }
              if (event.key === 'ArrowUp' && rentalTypeOpen) {
                event.preventDefault()
                setRentalTypeHighlight(
                  (prev) => (prev - 1 + RENTAL_TYPE_OPTIONS.length) % RENTAL_TYPE_OPTIONS.length
                )
              }
            }}
          >
            {selectedRentalOption ? (
              <>
                <span className="font-semibold">{selectedRentalOption.value}</span>
                <span className="mt-0.5 text-xs text-ink-muted">
                  {selectedRentalOption.description}
                </span>
              </>
            ) : (
              <span className="text-ink-faint">Select rental type</span>
            )}
          </button>

          {rentalTypeOpen ? (
            <ul
              id={`${rentalTypeListId}-options`}
              role="listbox"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/15 bg-surface-paper py-1 shadow-lift"
            >
              {RENTAL_TYPE_OPTIONS.map((option, index) => (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={propertyType === option.value}
                    className={cn(
                      'flex w-full flex-col px-3 py-2.5 text-left transition-colors',
                      index === rentalTypeHighlight || propertyType === option.value
                        ? 'bg-brand/10'
                        : 'hover:bg-surface'
                    )}
                    onMouseEnter={() => setRentalTypeHighlight(index)}
                    onClick={() => {
                      setPropertyType(option.value)
                      setRentalTypeOpen(false)
                      if (fieldErrors.propertyType) {
                        setFieldErrors((prev) => ({ ...prev, propertyType: undefined }))
                      }
                    }}
                  >
                    <span className="text-sm font-semibold text-ink">{option.value}</span>
                    <span className="mt-0.5 text-xs leading-snug text-ink-muted">
                      {option.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {fieldErrors.propertyType ? (
            <p className="mt-1.5 text-xs text-accent" role="alert">
              {fieldErrors.propertyType}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Number of Bedrooms"
            name="bedrooms"
            inputMode="numeric"
            pattern="[0-9]*"
            value={bedrooms}
            onChange={(e) => {
              setBedrooms(e.target.value)
              if (fieldErrors.bedrooms) setFieldErrors((prev) => ({ ...prev, bedrooms: undefined }))
            }}
            placeholder="0"
            required
            error={fieldErrors.bedrooms}
          />
          <Input
            label="Maximum Tenants"
            name="maxTenants"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxTenants}
            onChange={(e) => {
              setMaxTenants(e.target.value)
              if (fieldErrors.maxTenants) {
                setFieldErrors((prev) => ({ ...prev, maxTenants: undefined }))
              }
            }}
            placeholder="1"
            required
            error={fieldErrors.maxTenants}
          />
        </div>

        {showUnitCount ? (
          <Input
            label="Number of Units"
            name="unitCount"
            inputMode="numeric"
            pattern="[0-9]*"
            value={unitCount}
            onChange={(e) => {
              setUnitCount(e.target.value)
              if (fieldErrors.unitCount) {
                setFieldErrors((prev) => ({ ...prev, unitCount: undefined }))
              }
            }}
            placeholder={propertyType ? String(suggestedUnitCount(propertyType)) : '1'}
            hint={
              propertyType === 'Duplex' ||
              propertyType === 'Triplex' ||
              propertyType === 'Fourplex'
                ? `Suggested for ${propertyType}: ${suggestedUnitCount(propertyType)} units. Confirm or adjust as needed.`
                : 'Enter how many separate rental units this building or complex contains.'
            }
            required
            error={fieldErrors.unitCount}
          />
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? 'Saving…' : 'Save Rental'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function AddPropertyButton({
  onClick,
  size = 'md',
}: {
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  return (
    <Button
      type="button"
      size={size}
      onClick={onClick}
      className={cn(
        'transition-transform duration-200 ease-out hover:scale-[1.04] hover:shadow-[2px_2px_0_0_rgba(17,17,17,0.35)]'
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      Add Rental
    </Button>
  )
}

/** Alias matching Rentals page terminology. */
export const AddRentalButton = AddPropertyButton
export const AddRentalModal = AddPropertyModal
