import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { AddressAutocomplete } from '@/components/properties/AddressAutocomplete'
import { Button } from '@/components/ui/Button'
import { FormLabel, Input, Select } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { useApp } from '@/context/AppContext'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  listDefaultLeaseOptions,
  resolveScheduleAsOf,
  seasonalLeaseOptionId,
} from '@/lib/leaseSchedule'
import {
  BED_SIZE_LABELS,
  bedCapacityForSize,
  createBed,
  createBedroom,
  findLayoutAssignmentConflicts,
  isCompleteBedroomsLayout,
  maxOccupancyFromLayout,
  totalBedCount,
} from '@/lib/rentalBeds'
import {
  RENTAL_TYPE_OPTIONS,
  rentalTypeShowsUnitCount,
  suggestedUnitCount,
} from '@/lib/rentalTypes'
import {
  RENTAL_CATEGORY_LABELS,
  resolveRentalCategory,
  type RentalCategory,
} from '@/lib/rentalCategory'
import { cn, formatDate } from '@/lib/utils'
import type {
  BedSize,
  Property,
  PropertyAddressDetails,
  PropertyBedroom,
  PropertyHousingType,
  PropertyPricingStructure,
} from '@/types'
import { BED_SIZES } from '@/types'

interface RentalFormModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  /** When set, modal edits this rental instead of creating one. */
  property?: Property | null
}

interface FieldErrors {
  address?: string
  propertyType?: string
  furnished?: string
  pricingStructure?: string
  bedrooms?: string
  unitCount?: string
  monthlyRent?: string
  depositAmount?: string
  utilitiesIncluded?: string
  layout?: string
}

type FurnishedChoice = '' | 'yes' | 'no'
type DepositChoice = '' | 'yes' | 'no'
type UtilitiesChoice = '' | 'yes' | 'no'

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

function parsePositiveMoney(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,\s]/g, '')
  if (!trimmed) return null
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 ? n : null
}

function layoutFromBedroomCount(count: number, previous?: PropertyBedroom[]): PropertyBedroom[] {
  const n = Math.max(0, count)
  if (n === 0) return [createBedroom(1)]
  const next: PropertyBedroom[] = []
  for (let i = 0; i < n; i++) {
    const existing = previous?.[i]
    if (existing) {
      next.push({
        ...existing,
        label: `Bedroom ${i + 1}`,
        beds:
          existing.beds.length > 0
            ? existing.beds
            : [createBed('queen', 1)],
      })
    } else {
      next.push(createBedroom(i + 1))
    }
  }
  return next
}

function pricingHint(structure: PropertyPricingStructure | ''): string {
  if (structure === 'room') {
    return 'Total rent is shared across bedrooms. Tenants see cost per person at full occupancy.'
  }
  if (structure === 'bed') {
    return 'Total rent is allocated by physical beds. Changing bed size does not rewrite total rent.'
  }
  if (structure === 'person') {
    return 'Total rent splits evenly by headcount. Applicants see cost per person as they add roommates.'
  }
  return 'Choose how total rent is structured for applicants and leases.'
}

export function AddPropertyModal({
  open,
  onClose,
  onSaved,
  property = null,
}: RentalFormModalProps) {
  const { addProperty, updateProperty, clients, settings } = useApp()
  const isEdit = Boolean(property?.id)
  const rentalTypeListId = useId()
  const rentalTypeRef = useRef<HTMLDivElement>(null)
  const leaseOptions = useMemo(
    () => listDefaultLeaseOptions(settings, resolveScheduleAsOf()),
    [settings]
  )
  const defaultLeaseOptionFallback = seasonalLeaseOptionId(DEFAULT_LEASE_LENGTH_MONTHS)
  const [address, setAddress] = useState('')
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [addressDetails, setAddressDetails] = useState<PropertyAddressDetails | undefined>()
  const [propertyType, setPropertyType] = useState<PropertyHousingType | ''>('')
  const [rentalTypeOpen, setRentalTypeOpen] = useState(false)
  const [rentalTypeHighlight, setRentalTypeHighlight] = useState(0)
  const [rentalCategory, setRentalCategory] = useState<RentalCategory>('standard_rental')
  const [furnished, setFurnished] = useState<FurnishedChoice>('')
  const [pricingStructure, setPricingStructure] = useState<PropertyPricingStructure | ''>('')
  const [hasDeposit, setHasDeposit] = useState<DepositChoice>('')
  const [depositAmount, setDepositAmount] = useState('')
  const [utilitiesIncluded, setUtilitiesIncluded] = useState<UtilitiesChoice>('')
  const [entireHomeOnly, setEntireHomeOnly] = useState(false)
  const [bedrooms, setBedrooms] = useState('')
  const [layout, setLayout] = useState<PropertyBedroom[]>([])
  const [unitCount, setUnitCount] = useState('1')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [defaultLeaseOptionId, setDefaultLeaseOptionId] = useState(defaultLeaseOptionFallback)
  /** '' = use account Preferences; 'yes' = required; 'no' = optional */
  const [conditionReportRequired, setConditionReportRequired] = useState<'' | 'yes' | 'no'>('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const showUnitCount = propertyType ? rentalTypeShowsUnitCount(propertyType) : false
  const isFurnished = furnished === 'yes'

  const maxOccupancy = useMemo(() => maxOccupancyFromLayout(layout), [layout])
  const bedCount = useMemo(() => totalBedCount({ bedroomsLayout: layout }), [layout])
  const rentPreview = useMemo(() => parsePositiveMoney(monthlyRent), [monthlyRent])
  const costPerPersonAtMax =
    rentPreview != null && maxOccupancy > 0
      ? Math.round((rentPreview / maxOccupancy) * 100) / 100
      : null

  const hydrateFromProperty = (p: Property) => {
    setAddress(p.address)
    setAddressConfirmed(Boolean(p.addressConfirmed) || Boolean(p.addressDetails))
    setAddressDetails(p.addressDetails)
    setPropertyType(p.propertyType)
    setRentalCategory(resolveRentalCategory(p.rentalCategory))
    setFurnished(p.furnished === true ? 'yes' : 'no')
    const pricing =
      p.pricingStructure === 'room' || p.pricingStructure === 'person' || p.pricingStructure === 'bed'
        ? p.pricingStructure === 'bed' && p.furnished !== true
          ? 'person'
          : p.pricingStructure
        : p.furnished === true
          ? 'bed'
          : 'person'
    setPricingStructure(pricing)
    if (p.depositAmount != null && p.depositAmount > 0) {
      setHasDeposit('yes')
      setDepositAmount(String(p.depositAmount))
    } else {
      setHasDeposit('no')
      setDepositAmount('')
    }
    setUtilitiesIncluded(p.utilitiesIncluded === true ? 'yes' : 'no')
    setEntireHomeOnly(p.entireHomeOnly === true)
    setBedrooms(String(p.bedrooms ?? p.bedroomsLayout?.length ?? 0))
    setLayout(
      p.bedroomsLayout?.length
        ? p.bedroomsLayout.map((room, i) => ({
            ...room,
            label: room.label || `Bedroom ${i + 1}`,
            privacy:
              room.privacy === 'private' || room.privacy === 'shared'
                ? room.privacy
                : room.beds.length > 1
                  ? 'shared'
                  : 'private',
            beds: room.beds.map((bed, j) => ({
              ...bed,
              label: bed.label || `Bed ${j + 1}`,
              capacity: bedCapacityForSize(bed.size),
            })),
          }))
        : layoutFromBedroomCount(p.bedrooms || 1)
    )
    setUnitCount(String(p.unitCount || 1))
    setMonthlyRent(p.monthlyRent != null ? String(p.monthlyRent) : '')
    const savedOption = p.defaultLeaseOptionId?.trim()
    setDefaultLeaseOptionId(
      savedOption && leaseOptions.some((option) => option.id === savedOption)
        ? savedOption
        : defaultLeaseOptionFallback
    )
    setConditionReportRequired(
      p.conditionReportRequired === true
        ? 'yes'
        : p.conditionReportRequired === false
          ? 'no'
          : ''
    )
  }

  useEffect(() => {
    if (!open) return
    if (property) {
      hydrateFromProperty(property)
    }
  }, [open, property?.id])

  useEffect(() => {
    if (!propertyType || isEdit) return
    setUnitCount(String(suggestedUnitCount(propertyType)))
  }, [propertyType, isEdit])

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
    setRentalCategory('standard_rental')
    setFurnished('')
    setPricingStructure('')
    setHasDeposit('')
    setDepositAmount('')
    setUtilitiesIncluded('')
    setEntireHomeOnly(false)
    setBedrooms('')
    setLayout([])
    setUnitCount('1')
    setMonthlyRent('')
    setDefaultLeaseOptionId(defaultLeaseOptionFallback)
    setConditionReportRequired('')
    setFieldErrors({})
    setError('')
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const applyBedroomCount = (raw: string) => {
    setBedrooms(raw)
    const n = parseNonNegativeInt(raw)
    if (n === null) return
    setLayout((prev) => layoutFromBedroomCount(n, prev))
    if (fieldErrors.bedrooms || fieldErrors.layout) {
      setFieldErrors((prev) => ({ ...prev, bedrooms: undefined, layout: undefined }))
    }
  }

  const updateBedSize = (bedroomId: string, bedId: string, size: BedSize) => {
    setLayout((prev) =>
      prev.map((room) =>
        room.id !== bedroomId
          ? room
          : {
              ...room,
              beds: room.beds.map((bed) =>
                bed.id !== bedId
                  ? bed
                  : { ...bed, size, capacity: bedCapacityForSize(size) }
              ),
            }
      )
    )
    if (fieldErrors.layout) setFieldErrors((prev) => ({ ...prev, layout: undefined }))
  }

  const addBedToRoom = (bedroomId: string) => {
    setLayout((prev) =>
      prev.map((room) =>
        room.id !== bedroomId
          ? room
          : {
              ...room,
              privacy: 'shared',
              beds: [...room.beds, createBed('twin', room.beds.length + 1)],
            }
      )
    )
  }

  const updateRoomPrivacy = (bedroomId: string, privacy: 'private' | 'shared') => {
    setLayout((prev) =>
      prev.map((room) => (room.id !== bedroomId ? room : { ...room, privacy }))
    )
  }

  const removeBed = (bedroomId: string, bedId: string) => {
    setLayout((prev) =>
      prev.map((room) => {
        if (room.id !== bedroomId) return room
        if (room.beds.length <= 1) return room
        return {
          ...room,
          beds: room.beds
            .filter((b) => b.id !== bedId)
            .map((b, i) => ({ ...b, label: `Bed ${i + 1}` })),
        }
      })
    )
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      next.address = 'Address cannot be blank'
    } else if (!addressConfirmed && !isEdit) {
      next.address = 'Select or confirm a valid address before saving'
    }

    if (!propertyType) {
      next.propertyType = 'Select a rental type'
    }

    if (!furnished) {
      next.furnished = 'Choose whether this rental is furnished'
    }

    if (!pricingStructure) {
      next.pricingStructure = 'Choose a pricing structure'
    } else if (pricingStructure === 'bed' && furnished !== 'yes') {
      next.pricingStructure = 'Pricing by bed is only available for furnished rentals'
    }

    if (!hasDeposit) {
      next.depositAmount = 'Choose whether this rental requires a deposit'
    } else if (hasDeposit === 'yes') {
      const deposit = parsePositiveMoney(depositAmount)
      if (depositAmount.trim() === '') {
        next.depositAmount = 'Enter the deposit amount'
      } else if (deposit === null) {
        next.depositAmount = 'Enter a valid deposit amount'
      }
    }

    if (!utilitiesIncluded) {
      next.utilitiesIncluded = 'Choose whether utilities are included in rent'
    }

    const beds = parseNonNegativeInt(bedrooms)
    if (bedrooms.trim() === '') {
      next.bedrooms = 'Enter the number of bedrooms'
    } else if (beds === null) {
      next.bedrooms = 'Bedrooms must be a whole number (no letters or decimals)'
    } else if (beds < 0) {
      next.bedrooms = 'Bedrooms must be zero or greater'
    }

    if (!isCompleteBedroomsLayout(layout)) {
      next.layout =
        'Configure at least one bed with a size for every bedroom before saving'
    }

    if (!monthlyRent.trim()) {
      next.monthlyRent = 'Enter the total monthly rent'
    } else {
      const rent = parsePositiveMoney(monthlyRent)
      if (rent === null) {
        next.monthlyRent = 'Enter a valid monthly rent amount'
      }
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

    if (isEdit && property && isCompleteBedroomsLayout(layout)) {
      const atProperty = clients.filter(
        (c) =>
          c.propertyId === property.id ||
          (c.bedId &&
            property.bedroomsLayout?.some((r) => r.beds.some((b) => b.id === c.bedId)))
      )
      const conflicts = findLayoutAssignmentConflicts(property, layout, atProperty)
      if (conflicts.length > 0) {
        const names = conflicts
          .flatMap((c) => c.tenants.map((t) => t.name))
          .filter((n, i, arr) => arr.indexOf(n) === i)
        next.layout = `Reassign tenants before saving: ${names.join(', ')}. A bed they occupy is being removed or no longer has enough capacity.`
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
    const units = showUnitCount ? parseNonNegativeInt(unitCount) : 1
    if (beds === null || units === null || !propertyType || !furnished || !pricingStructure) return
    if (!utilitiesIncluded) return
    const rent = parsePositiveMoney(monthlyRent)
    if (rent == null) return
    const deposit =
      hasDeposit === 'yes' ? parsePositiveMoney(depositAmount) : null
    if (hasDeposit === 'yes' && deposit == null) return

    const payload = {
      address: address.trim(),
      propertyType,
      rentalCategory,
      bedrooms: Math.max(layout.length, beds),
      maxTenants: Math.max(1, maxOccupancy),
      unitCount: units,
      bedroomsLayout: layout,
      monthlyRent: rent,
      furnished: furnished === 'yes',
      pricingStructure:
        pricingStructure === 'bed' && furnished !== 'yes' ? 'person' : pricingStructure,
      depositAmount: hasDeposit === 'yes' ? deposit : null,
      utilitiesIncluded: utilitiesIncluded === 'yes',
      entireHomeOnly,
      defaultLeaseOptionId,
      conditionReportRequired:
        conditionReportRequired === 'yes'
          ? true
          : conditionReportRequired === 'no'
            ? false
            : null,
      addressConfirmed: true,
      addressDetails,
      ...(isEdit && property
        ? {
            offMarket: property.offMarket === true,
            offMarketReason: property.offMarketReason?.trim() || null,
            offMarketAt: property.offMarketAt ?? null,
          }
        : {}),
    }

    setSubmitting(true)
    try {
      if (isEdit && property) {
        await updateProperty(property.id, payload)
      } else {
        await addProperty(payload)
      }
      reset()
      onSaved?.()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isEdit
            ? 'Could not update rental'
            : 'Could not add rental'
      )
      setSubmitting(false)
    }
  }

  const selectedRentalOption = RENTAL_TYPE_OPTIONS.find((option) => option.value === propertyType)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Rental' : 'Add Rental'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-muted">
          {isEdit
            ? 'Update furnished status, pricing, deposit, utilities, bedrooms, and beds. Maximum occupancy comes from bed sizes.'
            : 'Start with furnished or not, then pricing, deposit, and utilities. Configure bedrooms and beds — maximum occupancy is calculated from bed sizes.'}
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

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">
            Housing category
          </legend>
          <div role="group" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: 'student_housing' as const,
                  label: RENTAL_CATEGORY_LABELS.student_housing,
                  hint: 'Geared toward students / campus-area rentals',
                },
                {
                  value: 'standard_rental' as const,
                  label: RENTAL_CATEGORY_LABELS.standard_rental,
                  hint: 'General residential rental',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={rentalCategory === option.value}
                onClick={() => setRentalCategory(option.value)}
                className={cn(
                  'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-3 text-left transition-colors',
                  rentalCategory === option.value
                    ? 'border-brand bg-brand/5'
                    : 'border-line bg-surface-paper hover:border-brand/40'
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">
            Is this rental furnished? <span className="text-accent">*</span>
          </legend>
          <div role="group" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: 'yes' as const, label: 'Furnished', hint: 'Includes furniture for tenants' },
                { value: 'no' as const, label: 'Unfurnished', hint: 'Tenants bring their own furniture' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={furnished === option.value}
                onClick={() => {
                  setFurnished(option.value)
                  if (option.value === 'no' && pricingStructure === 'bed') {
                    setPricingStructure('person')
                  }
                  if (fieldErrors.furnished) {
                    setFieldErrors((prev) => ({ ...prev, furnished: undefined }))
                  }
                }}
                className={cn(
                  'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-3 text-left transition-colors',
                  furnished === option.value
                    ? 'border-brand bg-brand/5'
                    : 'border-line bg-surface-paper hover:border-brand/40'
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
              </button>
            ))}
          </div>
          {fieldErrors.furnished ? (
            <p className="mt-1.5 text-xs text-accent" role="alert">
              {fieldErrors.furnished}
            </p>
          ) : null}
        </fieldset>

        {furnished ? (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Pricing structure <span className="text-accent">*</span>
            </legend>
            <div
              role="group"
              className={cn('grid gap-2', isFurnished ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
            >
              {(
                [
                  { value: 'room' as const, label: 'By room', hint: 'Always available' },
                  { value: 'person' as const, label: 'By person', hint: 'Always available' },
                  ...(isFurnished
                    ? [{ value: 'bed' as const, label: 'By bed', hint: 'Furnished only' }]
                    : []),
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pricingStructure === option.value}
                  onClick={() => {
                    setPricingStructure(option.value)
                    if (fieldErrors.pricingStructure) {
                      setFieldErrors((prev) => ({ ...prev, pricingStructure: undefined }))
                    }
                  }}
                  className={cn(
                    'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-3 text-left transition-colors',
                    pricingStructure === option.value
                      ? 'border-brand bg-brand/5'
                      : 'border-line bg-surface-paper hover:border-brand/40'
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">{pricingHint(pricingStructure)}</p>
            {fieldErrors.pricingStructure ? (
              <p className="mt-1 text-xs text-accent" role="alert">
                {fieldErrors.pricingStructure}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {furnished ? (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Security deposit <span className="text-accent">*</span>
            </legend>
            <div role="group" className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { value: 'yes' as const, label: 'Yes — require a deposit' },
                  { value: 'no' as const, label: 'No deposit' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={hasDeposit === option.value}
                  onClick={() => {
                    setHasDeposit(option.value)
                    if (option.value === 'no') setDepositAmount('')
                    if (fieldErrors.depositAmount) {
                      setFieldErrors((prev) => ({ ...prev, depositAmount: undefined }))
                    }
                  }}
                  className={cn(
                    'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    hasDeposit === option.value
                      ? 'border-brand bg-brand/5 text-ink'
                      : 'border-line bg-surface-paper text-ink hover:border-brand/40'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasDeposit === 'yes' ? (
              <div className="mt-3">
                <Input
                  label="Deposit amount"
                  name="depositAmount"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => {
                    setDepositAmount(e.target.value)
                    if (fieldErrors.depositAmount) {
                      setFieldErrors((prev) => ({ ...prev, depositAmount: undefined }))
                    }
                  }}
                  placeholder="e.g. 1800"
                  required
                  error={fieldErrors.depositAmount}
                />
              </div>
            ) : fieldErrors.depositAmount ? (
              <p className="mt-1.5 text-xs text-accent" role="alert">
                {fieldErrors.depositAmount}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {furnished ? (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">
              Are utilities included in rent? <span className="text-accent">*</span>
            </legend>
            <div role="group" className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: 'yes' as const,
                    label: 'Yes — utilities included',
                    hint: 'Shown to applicants as Utilities included',
                  },
                  {
                    value: 'no' as const,
                    label: 'No — tenant pays utilities',
                    hint: 'Noted on the address dropdown as Utilities not included',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={utilitiesIncluded === option.value}
                  onClick={() => {
                    setUtilitiesIncluded(option.value)
                    if (fieldErrors.utilitiesIncluded) {
                      setFieldErrors((prev) => ({ ...prev, utilitiesIncluded: undefined }))
                    }
                  }}
                  className={cn(
                    'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 text-left transition-colors',
                    utilitiesIncluded === option.value
                      ? 'border-brand bg-brand/5 text-ink'
                      : 'border-line bg-surface-paper text-ink hover:border-brand/40'
                  )}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
                </button>
              ))}
            </div>
            {fieldErrors.utilitiesIncluded ? (
              <p className="mt-1.5 text-xs text-accent" role="alert">
                {fieldErrors.utilitiesIncluded}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">
            Whole property or single room?
          </legend>
          <p className="mb-2 text-xs text-ink-muted">
            You decide whether this rental is the entire unit or a room within it.
          </p>
          <div role="group" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: false,
                  label: 'Allow roommates / rooms',
                  hint: 'Applicants can choose entire home, a room, or beds',
                },
                {
                  value: true,
                  label: 'Entire home only',
                  hint: 'Whole property — no roommate or per-room placements',
                },
              ] as const
            ).map((option) => (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={entireHomeOnly === option.value}
                onClick={() => setEntireHomeOnly(option.value)}
                className={cn(
                  'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 text-left transition-colors',
                  entireHomeOnly === option.value
                    ? 'border-brand bg-brand/5'
                    : 'border-line bg-surface-paper hover:border-brand/40'
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

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
            onChange={(e) => applyBedroomCount(e.target.value)}
            placeholder="0"
            required
            error={fieldErrors.bedrooms}
          />
          <Input
            label="Total Monthly Rent"
            name="monthlyRent"
            inputMode="decimal"
            value={monthlyRent}
            onChange={(e) => {
              setMonthlyRent(e.target.value)
              if (fieldErrors.monthlyRent) {
                setFieldErrors((prev) => ({ ...prev, monthlyRent: undefined }))
              }
            }}
            placeholder="e.g. 1800"
            required
            hint={
              costPerPersonAtMax != null
                ? `Required for every rental (furnished or unfurnished). At full occupancy (${maxOccupancy}): $${costPerPersonAtMax.toLocaleString('en-US', { maximumFractionDigits: 2 })}/person.`
                : 'Required for every rental. Cost at full occupancy appears once beds set max occupancy.'
            }
            error={fieldErrors.monthlyRent}
          />
        </div>

        <Select
          label="Default lease option"
          name="defaultLeaseOptionId"
          required
          value={defaultLeaseOptionId}
          onChange={(e) => setDefaultLeaseOptionId(e.target.value)}
          hint="From Help and Settings → Lease Defaults. Seasonal lengths and any custom lease eras you added."
        >
          {leaseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.kind === 'custom'
                ? `Custom · ${option.label}`
                : `${option.label} · ${formatDate(option.leaseStartDate)} – ${formatDate(option.leaseEndDate)}`}
            </option>
          ))}
        </Select>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Condition report for this rental
          </legend>
          <p className="mb-2 text-xs text-ink-muted">
            Move-in / move-out inspection checklist. Account default is set in Company Profile
            &amp; Preferences — override here per rental.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  value: '' as const,
                  label: 'Use account default',
                  hint: 'Follow Preferences',
                },
                {
                  value: 'yes' as const,
                  label: 'Required',
                  hint: 'Tenant must submit',
                },
                {
                  value: 'no' as const,
                  label: 'Optional',
                  hint: 'Encouraged, not required',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={conditionReportRequired === option.value}
                onClick={() => setConditionReportRequired(option.value)}
                className={cn(
                  'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 text-left transition-colors',
                  conditionReportRequired === option.value
                    ? 'border-brand bg-brand/5 text-ink'
                    : 'border-line bg-surface-paper text-ink hover:border-brand/40'
                )}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {costPerPersonAtMax != null ? (
          <div className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Cost at full occupancy
            </p>
            <p className="mt-0.5 text-sm text-ink">
              <span className="font-semibold">
                ${costPerPersonAtMax.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              /person when all {maxOccupancy}{' '}
              {maxOccupancy === 1 ? 'spot is' : 'spots are'} filled — shown to applicants with total
              rent
              {utilitiesIncluded === 'yes'
                ? ' and Utilities included'
                : utilitiesIncluded === 'no'
                  ? ' and Utilities not included'
                  : ''}
              .
            </p>
          </div>
        ) : null}

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

        {layout.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">Bedroom &amp; bed configuration</h3>
              <p className="text-sm font-semibold text-ink">
                Maximum Occupancy:{' '}
                <span className="tabular-nums">
                  {maxOccupancy} {maxOccupancy === 1 ? 'person' : 'people'}
                </span>
                <span className="mx-1.5 text-ink-faint">·</span>
                <span className="font-medium text-ink-muted">
                  {bedCount} {bedCount === 1 ? 'bed' : 'beds'}
                </span>
              </p>
            </div>

            {fieldErrors.layout ? (
              <p className="rounded-sm border border-accent/40 bg-accent-light px-3 py-2 text-xs text-accent" role="alert">
                {fieldErrors.layout}
              </p>
            ) : null}

            <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {layout.map((room) => (
                <div
                  key={room.id}
                  className="rounded-[var(--radius-sm)] border border-line bg-surface-paper px-3 py-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink">{room.label}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-xs text-ink"
                        value={room.privacy === 'shared' ? 'shared' : 'private'}
                        aria-label={`${room.label} privacy`}
                        onChange={(e) =>
                          updateRoomPrivacy(
                            room.id,
                            e.target.value === 'shared' ? 'shared' : 'private'
                          )
                        }
                      >
                        <option value="private">Single room</option>
                        <option value="shared">Shared room</option>
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addBedToRoom(room.id)}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Add bed
                      </Button>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {room.beds.map((bed) => (
                      <li
                        key={bed.id}
                        className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                      >
                        <span className="w-14 shrink-0 text-xs font-medium text-ink-muted">
                          {bed.label}
                        </span>
                        <select
                          className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                          value={bed.size}
                          aria-label={`${room.label} ${bed.label} size`}
                          onChange={(e) =>
                            updateBedSize(room.id, bed.id, e.target.value as BedSize)
                          }
                        >
                          {BED_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {BED_SIZE_LABELS[size]}
                              {` (${bedCapacityForSize(size)} ${
                                bedCapacityForSize(size) === 1 ? 'person' : 'people'
                              })`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-accent-light hover:text-accent disabled:opacity-40"
                          disabled={room.beds.length <= 1}
                          title="Remove bed"
                          aria-label={`Remove ${bed.label} from ${room.label}`}
                          onClick={() => removeBed(room.id, bed.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Rental'}
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
export const EditRentalModal = AddPropertyModal
