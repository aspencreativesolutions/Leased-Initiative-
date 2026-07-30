import { useMemo } from 'react'
import { FormLabel } from '@/components/ui/FormField'
import {
  bedsWithOpenCapacity,
  formatBedAssignmentLabel,
  formatBedSizeLabel,
  resolveFurnishedFlag,
} from '@/lib/rentalBeds'
import { cn } from '@/lib/utils'
import type { Client, Property } from '@/types'

export type BedAssignmentValue = {
  propertyId: string
  bedroomId: string
  bedId: string
  unitOrRoomLabel: string
}

type TenantBedAssignmentPickerProps = {
  property: Property
  occupants: Client[]
  clientId: string
  value: { bedroomId?: string; bedId?: string }
  onChange: (next: BedAssignmentValue | null) => void
  error?: string
  className?: string
}

/**
 * Landlord picker: assign a tenant to a bedroom + bed within a rental.
 * Twin beds allow 1 occupant; Full/Queen/King allow up to 2.
 */
export function TenantBedAssignmentPicker({
  property,
  occupants,
  clientId,
  value,
  onChange,
  error,
  className,
}: TenantBedAssignmentPickerProps) {
  const furnished = resolveFurnishedFlag(property)
  const options = useMemo(
    () => bedsWithOpenCapacity(property, occupants, { ignoreClientId: clientId }),
    [property, occupants, clientId]
  )

  const selectedKey =
    value.bedroomId && value.bedId ? `${value.bedroomId}::${value.bedId}` : ''

  return (
    <div className={cn('space-y-1.5', className)}>
      <FormLabel label="Bed assignment" htmlFor={`bed-assign-${clientId}`} required />
      <select
        id={`bed-assign-${clientId}`}
        className={cn(
          'w-full rounded-[var(--radius-sm)] border border-line bg-surface-paper px-3 py-2 text-sm text-ink',
          error && 'border-accent'
        )}
        value={selectedKey}
        onChange={(event) => {
          const key = event.target.value
          if (!key) {
            onChange(null)
            return
          }
          const [bedroomId, bedId] = key.split('::')
          const match = options.find(
            (o) => o.bedroom.id === bedroomId && o.bed.id === bedId
          )
          if (!match) {
            onChange(null)
            return
          }
          onChange({
            propertyId: property.id,
            bedroomId: match.bedroom.id,
            bedId: match.bed.id,
            unitOrRoomLabel: formatBedAssignmentLabel(
              match.bedroom,
              match.bed,
              furnished
            ),
          })
        }}
      >
        <option value="">Select bedroom and bed</option>
        {options.map(({ bedroom, bed, assigned, openSlots }) => {
          const key = `${bedroom.id}::${bed.id}`
          const isCurrent = value.bedId === bed.id
          const disabled = openSlots <= 0 && !isCurrent
          const names =
            assigned.length > 0
              ? ` — ${assigned.map((t) => t.name).join(', ')}`
              : ''
          const availability =
            openSlots <= 0 && !isCurrent
              ? ' (full)'
              : bed.capacity === 2
                ? ` (${assigned.length}/${bed.capacity} occupied)`
                : assigned.length > 0
                  ? ' (occupied)'
                  : ' (open)'
          const sizeOrBed = formatBedSizeLabel(bed, furnished)
          return (
            <option key={key} value={key} disabled={disabled}>
              {bedroom.label} · {sizeOrBed}
              {furnished && bed.label ? ` (${bed.label})` : ''}
              {availability}
              {names}
            </option>
          )
        })}
      </select>
      {error ? (
        <p className="text-xs text-accent" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          {furnished
            ? 'Couples may share a Full, Queen, or King. Twin beds hold one person. Shared beds still count as one rentable bed space.'
            : 'Assign tenants to sleeping spaces by occupancy capacity. Couples may share a two-person space.'}
        </p>
      )}
    </div>
  )
}
