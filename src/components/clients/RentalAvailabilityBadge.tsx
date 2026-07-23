import { cn } from '@/lib/utils'

type RentalAvailabilityBadgeProps = {
  /** Remaining slots under maxTenants; null when the rental is missing from Rentals. */
  availableUnits: number | null
  className?: string
}

/**
 * Compact occupancy badge for Waiting to Connect / New Registrations.
 * Green + pulse when space remains; neutral when full or rental removed.
 */
export function RentalAvailabilityBadge({
  availableUnits,
  className,
}: RentalAvailabilityBadgeProps) {
  if (availableUnits == null) {
    return (
      <span
        className={cn(
          'availability-badge availability-badge--missing inline-flex',
          className
        )}
      >
        Rental no longer listed
      </span>
    )
  }

  if (availableUnits <= 0) {
    return (
      <span
        className={cn(
          'availability-badge availability-badge--full inline-flex',
          className
        )}
      >
        No Units Currently Available
      </span>
    )
  }

  const unitLabel = availableUnits === 1 ? 'Unit' : 'Units'
  return (
    <span
      className={cn(
        'availability-badge availability-badge--open availability-badge--breathe inline-flex',
        className
      )}
    >
      Requesting 1 of {availableUnits} Available {unitLabel}
    </span>
  )
}
