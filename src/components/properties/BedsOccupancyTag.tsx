import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
import { cn } from '@/lib/utils'

export type BedsOccupancyOccupant = {
  id: string
  name: string
}

type BedsOccupancyTagProps = {
  bedrooms: number
  currentTenants: number
  maxTenants: number
  occupants: BedsOccupancyOccupant[]
  className?: string
}

/**
 * Compact beds + occupancy tag for rental tiles.
 * Hover swaps to “See Occupants”; click reveals the current occupant list.
 */
export function BedsOccupancyTag({
  bedrooms,
  currentTenants,
  maxTenants,
  occupants,
  className,
}: BedsOccupancyTagProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const bedLabel = `${bedrooms} ${bedrooms === 1 ? 'bed' : 'beds'}`
  const occupancyLabel = `${currentTenants} out of ${maxTenants} occupied`
  const label = `${bedLabel}, ${occupancyLabel}`
  const hoverLabel = 'See Occupants'

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={cn('beds-occupancy-tag', open && 'beds-occupancy-tag--open', className)}
    >
      {open ? (
        <button
          type="button"
          className="beds-occupancy-tag__trigger"
          aria-expanded={true}
          aria-controls={listId}
          aria-label={`${label}. Hide occupants`}
          onClick={(event) => {
            event.stopPropagation()
            setOpen(false)
          }}
        >
          <Users className="beds-occupancy-tag__icon" aria-hidden strokeWidth={1.75} />
          <span className="beds-occupancy-tag__label">{label}</span>
        </button>
      ) : (
        <InPlaceHoverText
          primary={
            <>
              <Users className="beds-occupancy-tag__icon" aria-hidden strokeWidth={1.75} />
              <span className="beds-occupancy-tag__label">{label}</span>
            </>
          }
          secondary={<span className="whitespace-nowrap">{hoverLabel}</span>}
          ariaLabel={`${label}. ${hoverLabel}`}
          requireRevealBeforeActivate
          layerClassName="gap-[0.35rem]"
          className="beds-occupancy-tag__trigger beds-occupancy-tag__trigger--swap"
          onActivate={(event) => {
            event.stopPropagation()
            setOpen(true)
          }}
        />
      )}

      {open ? (
        <div
          id={listId}
          className="beds-occupancy-tag__panel"
          role="region"
          aria-label="Current occupants"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="beds-occupancy-tag__panel-title">Current occupants</p>
          {occupants.length === 0 ? (
            <p className="beds-occupancy-tag__empty">No current occupants</p>
          ) : (
            <ul className="beds-occupancy-tag__list">
              {occupants.map((occupant) => (
                <li key={occupant.id}>
                  <Link
                    to={`/studio/clients/${occupant.id}`}
                    className="beds-occupancy-tag__link"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {occupant.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
