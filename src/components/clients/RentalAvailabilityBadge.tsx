import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
import { cn } from '@/lib/utils'

/** Must match `--availability-badge-breathe-duration` in index.css (2.6s). */
const AVAILABILITY_BADGE_BREATHE_MS = 2600

type RentalAvailabilityBadgeProps = {
  /** Remaining slots under maxTenants; null when the rental is missing from Rentals. */
  availableUnits: number | null
  /** When set with open units, badge links to Rentals and highlights that row. */
  propertyId?: string
  className?: string
}

/**
 * Phase-align breathe animations to one shared wall-clock timeline so every
 * Waiting to Connect tag expands/contracts together (no per-mount stagger).
 */
function syncedBreatheStyle(): CSSProperties {
  const elapsed =
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  return {
    ['--availability-badge-breathe-delay' as string]: `${-(elapsed % AVAILABILITY_BADGE_BREATHE_MS)}ms`,
  }
}

/**
 * Compact occupancy badge for Waiting to Connect / New Registrations.
 * Green + pulse when space remains; neutral when full or rental removed.
 * Open-unit badges navigate to Rentals and briefly highlight the property row.
 */
export function RentalAvailabilityBadge({
  availableUnits,
  propertyId,
  className,
}: RentalAvailabilityBadgeProps) {
  const navigate = useNavigate()
  const breatheStyleRef = useRef<CSSProperties | null>(null)

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

  if (breatheStyleRef.current == null) {
    breatheStyleRef.current = syncedBreatheStyle()
  }
  const breatheStyle = breatheStyleRef.current

  const unitLabel = availableUnits === 1 ? 'unit' : 'units'
  const label = `Requesting 1 of ${availableUnits} available ${unitLabel}`
  const hoverLabel = 'See in Rentals →'
  const canOpenRentals = Boolean(propertyId)
  const badgeClass = cn(
    'availability-badge availability-badge--open availability-badge--breathe',
    className
  )

  if (!canOpenRentals) {
    return (
      <span className={cn(badgeClass, 'inline-flex')} style={breatheStyle}>
        {label}
      </span>
    )
  }

  return (
    <InPlaceHoverText
      primary={<span className="truncate">{label}</span>}
      secondary={<span className="whitespace-nowrap">{hoverLabel}</span>}
      ariaLabel={`${label}. ${hoverLabel}`}
      requireRevealBeforeActivate
      className={cn(badgeClass, 'availability-badge--link inline-flex justify-center')}
      style={breatheStyle}
      onActivate={(event) => {
        event.stopPropagation()
        navigate(`/studio/properties?highlight=${encodeURIComponent(propertyId!)}`)
      }}
    />
  )
}
