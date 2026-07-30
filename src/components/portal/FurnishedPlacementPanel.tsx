import { BedDouble, Check, ChevronDown, DoorOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatUsd } from '@/lib/rentalRent'
import {
  bedCapacityLabel,
  pricingStructureLabel,
  type FurnishedPlacement,
} from '@/lib/furnishedOccupancy'
import type { BedroomPrivacy, PropertyPricingStructure } from '@/types'

export type PlacementInventoryView = {
  pricingStructure: PropertyPricingStructure
  entireHomeOnly?: boolean
  bedrooms: {
    id: string
    label: string
    privacy: BedroomPrivacy
    placements: FurnishedPlacement[]
  }[]
}

type FurnishedPlacementPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: PlacementInventoryView
  selectedPlacementId: string | null
  onSelectPlacement: (placement: FurnishedPlacement) => void
  /** When true, placements are not selectable (entire-home mode). */
  selectionDisabled?: boolean
}

/**
 * Expandable sleeping-arrangement panel opened from the Furnished status tag.
 */
export function FurnishedPlacementPanel({
  open,
  onOpenChange,
  inventory,
  selectedPlacementId,
  onSelectPlacement,
  selectionDisabled = false,
}: FurnishedPlacementPanelProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-1 text-xs font-semibold uppercase tracking-caps transition-colors',
          open
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-brand/40 bg-brand/5 text-brand hover:bg-brand/10'
        )}
      >
        Furnished
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface-paper px-3 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">
              {pricingStructureLabel(inventory.pricingStructure)}
            </span>
            {inventory.entireHomeOnly ? (
              <span className="rounded-[var(--radius-sm)] border border-line px-1.5 py-0.5 font-medium">
                Entire home only
              </span>
            ) : null}
          </div>

          <ul className="space-y-3">
            {inventory.bedrooms.map((room) => (
              <li key={room.id} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{room.label}</p>
                  <span className="text-[11px] font-medium uppercase tracking-caps text-ink-muted">
                    {room.privacy === 'private' ? 'Single room' : 'Shared room'}
                  </span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {room.placements.map((placement) => {
                    const selected = selectedPlacementId === placement.id
                    const disabled =
                      selectionDisabled || placement.occupied || placement.openSlots <= 0
                    return (
                      <li key={placement.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          aria-pressed={selected}
                          onClick={() => onSelectPlacement(placement)}
                          className={cn(
                            'flex w-full flex-col gap-1 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors',
                            disabled
                              ? 'cursor-not-allowed border-line bg-surface opacity-70'
                              : selected
                                ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                                : 'border-line bg-surface hover:border-brand/50'
                          )}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                              {placement.kind === 'room' ? (
                                <DoorOpen className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                              ) : (
                                <BedDouble className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                              )}
                              <span className="truncate">
                                {placement.kind === 'room'
                                  ? 'Whole room'
                                  : placement.bedLabel ?? 'Bed'}
                              </span>
                            </span>
                            {placement.occupied ? (
                              <span className="shrink-0 rounded-[var(--radius-sm)] border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
                                Occupied
                              </span>
                            ) : selected ? (
                              <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold uppercase tracking-caps text-brand">
                                <Check className="h-3 w-3" aria-hidden />
                                Selected
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-caps text-emerald-700">
                                Available
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {placement.kind === 'bed' && placement.bedSizeLabel
                              ? `${placement.bedSizeLabel} · `
                              : null}
                            {bedCapacityLabel(placement.capacity)}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-ink">
                            {placement.monthlyRent != null
                              ? `${formatUsd(placement.monthlyRent)}/mo`
                              : 'Rent TBA'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
