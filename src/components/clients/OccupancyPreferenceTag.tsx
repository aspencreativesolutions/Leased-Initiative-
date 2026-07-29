import { cn } from '@/lib/utils'
import {
  occupancyArrangementTagLabel,
  occupancyPreferenceLabel,
  resolveBedroomPrivacy,
  type CanonicalOccupancyMode,
} from '@/lib/furnishedOccupancy'
import type {
  Client,
  OccupancyArrangement,
  PreferredOccupancyMode,
  Property,
} from '@/types'

type OccupancyPreferenceTagProps = {
  mode?: PreferredOccupancyMode | string | null
  arrangement?: OccupancyArrangement | null
  property?: Property | null
  bedroomId?: string | null
  className?: string
}

/**
 * Compact occupancy tag under a tenant’s name (pipeline + official lists).
 */
export function OccupancyPreferenceTag({
  mode,
  arrangement,
  property,
  bedroomId,
  className,
}: OccupancyPreferenceTagProps) {
  let label = occupancyPreferenceLabel(mode)
  if (!label && arrangement) {
    const room = property?.bedroomsLayout?.find((b) => b.id === bedroomId)
    const privacy = room ? resolveBedroomPrivacy(room) : null
    label = occupancyArrangementTagLabel(arrangement, privacy)
  }
  if (!label) return null

  const tone = tagTone(label)
  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps',
        tone,
        className
      )}
      title={label}
    >
      {label}
    </span>
  )
}

function tagTone(label: string): string {
  if (label === 'Renting Entire Home') {
    return 'border-brand/30 bg-brand/10 text-brand'
  }
  if (label === 'Private Room') {
    return 'border-line bg-surface text-ink'
  }
  if (label === 'Shared Room') {
    return 'border-line bg-surface-paper text-ink-muted'
  }
  return 'border-brand/20 bg-brand/5 text-ink'
}

/** Resolve tag inputs from a Client row. */
export function clientOccupancyTagProps(
  client: Client,
  property?: Property | null
): OccupancyPreferenceTagProps {
  return {
    mode: client.preferredOccupancyMode,
    arrangement: client.occupancyArrangement,
    property,
    bedroomId: client.bedroomId,
  }
}

export function modeIsRoommateStyle(mode: CanonicalOccupancyMode | null): boolean {
  return (
    mode === 'open_to_roommates' ||
    mode === 'private_room' ||
    mode === 'shared_room'
  )
}
