import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { clientOccupancyTagProps } from '@/components/clients/OccupancyPreferenceTag'
import { cn } from '@/lib/utils'
import {
  resolveArrangementDisplayDetail,
  resolveArrangementDisplayTitle,
  resolveArrangementTenantLabel,
  type BedroomArrangementOccupant,
  type OccupancyShareDetail,
} from '@/lib/occupancyStatusFilter'
import type { OccupancyArrangement, PreferredOccupancyMode, Property } from '@/types'

type OccupancyStatusChipProps = {
  mode?: PreferredOccupancyMode | string | null
  arrangement?: OccupancyArrangement | null
  property?: Property | null
  bedroomId?: string | null
  className?: string
  shareDetail: OccupancyShareDetail
  /** Opens Tenant Details (or profile) for a roster occupant. */
  onOccupantClick?: (tenantId: string) => void
}

function titleTone(label: 'Sole Tenant' | 'Co-Tenant'): string {
  if (label === 'Sole Tenant') {
    return 'border-brand/30 bg-brand/10 text-brand'
  }
  return 'border-line bg-surface text-ink'
}

function RentStatusDot({
  paidOnFirst,
  name,
}: {
  paidOnFirst: boolean
  name: string
}) {
  return (
    <span
      className={cn(
        'mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full',
        paidOnFirst ? 'bg-[color:var(--deposit)]' : 'bg-[color:var(--table-remove-hover,#dc2626)]'
      )}
      title={
        paidOnFirst
          ? `${name}: rent paid on time (due on the 1st)`
          : `${name}: rent not paid on the 1st`
      }
      aria-label={
        paidOnFirst
          ? `${name}: rent paid on time`
          : `${name}: rent not paid on the 1st`
      }
    />
  )
}

function OccupantRow({
  occupant,
  onOccupantClick,
}: {
  occupant: BedroomArrangementOccupant
  onOccupantClick?: (tenantId: string) => void
}) {
  const content = (
    <>
      <span className="min-w-0 truncate">{occupant.name}</span>
      <RentStatusDot paidOnFirst={occupant.rentPaidOnFirst} name={occupant.name} />
    </>
  )

  if (!onOccupantClick) {
    return (
      <span className="inline-flex max-w-full items-start gap-1 text-ink/85">
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      className="inline-flex max-w-full items-start gap-1 text-left text-ink/85 hover:text-brand hover:underline"
      onClick={(event) => {
        event.stopPropagation()
        onOccupantClick(occupant.id)
      }}
      title={`Open details for ${occupant.name}`}
    >
      {content}
    </button>
  )
}

/**
 * Living-arrangement chip for the Official Tenants Arrangement column
 * (Show Arrangements). Title is Sole Tenant or Co-Tenant; subtitle is Entire
 * Home or roommate count. Open-to-roommates preference shows an asterisk note.
 */
export function OccupancyStatusChip({
  shareDetail,
  onOccupantClick,
  className,
}: OccupancyStatusChipProps) {
  const tenantLabel = resolveArrangementTenantLabel(shareDetail)
  const title = resolveArrangementDisplayTitle(shareDetail)
  const detail = resolveArrangementDisplayDetail(shareDetail)
  const showOpenToRoommatesNote = shareDetail.openToRoommates === true
  const tone = titleTone(tenantLabel)
  const roster = shareDetail.bedroomRoster
  const detailText = shareDetail.summaryLines.join(' · ')
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [bedroomsOpen, setBedroomsOpen] = useState(false)

  const multiBedroom = (roster?.totalBedrooms ?? 0) > 1
  const showInlineRoster = roster != null && !multiBedroom
  const vacantCount = roster?.rooms.filter((room) => room.vacant).length ?? 0

  const ariaParts = [
    title,
    detail,
    showOpenToRoommatesNote ? 'Open to Roommates' : null,
    detailText,
  ].filter(Boolean)

  useEffect(() => {
    if (!bedroomsOpen) return

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setBedroomsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBedroomsOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [bedroomsOpen])

  const bedroomTriggerLabel =
    roster == null
      ? null
      : roster.totalBedrooms === 1
        ? '1 bedroom'
        : vacantCount > 0
          ? `${roster.totalBedrooms} bedrooms · ${vacantCount} vacant`
          : `${roster.totalBedrooms} bedrooms`

  return (
    <div
      ref={rootRef}
      className={cn(
        'inline-flex max-w-[18rem] flex-col gap-0.5 rounded-[var(--radius-sm)] border px-1.5 py-1 text-left',
        tone,
        className
      )}
      title={ariaParts.join('. ')}
      role="status"
      aria-label={ariaParts.join('. ')}
    >
      <span className="text-[10px] font-semibold uppercase tracking-caps">{title}</span>
      <span className="text-[10px] font-medium normal-case leading-snug tracking-normal text-ink/85">
        {detail}
      </span>
      {showOpenToRoommatesNote ? (
        <span className="text-[10px] font-medium normal-case leading-snug tracking-normal text-ink/70">
          * Open to Roommates
        </span>
      ) : null}

      {multiBedroom && bedroomTriggerLabel ? (
        <>
          <button
            type="button"
            className="mt-0.5 inline-flex max-w-full items-center gap-0.5 text-[10px] font-semibold normal-case tracking-normal text-ink hover:text-brand"
            aria-expanded={bedroomsOpen}
            aria-controls={listId}
            onClick={(event) => {
              event.stopPropagation()
              setBedroomsOpen((open) => !open)
            }}
          >
            <span className="min-w-0 truncate">{bedroomTriggerLabel}</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 shrink-0 transition-transform',
                bedroomsOpen && 'rotate-180'
              )}
              aria-hidden
              strokeWidth={2.25}
            />
          </button>
          {bedroomsOpen ? (
            <ul id={listId} className="mt-0.5 space-y-1" role="list">
              {roster!.rooms.map((room) => (
                <li key={room.id} className="flex items-start gap-1.5 text-[10px] leading-snug">
                  <span className="w-3 shrink-0 font-semibold tabular-nums text-ink">
                    {room.index}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {room.vacant || room.occupants.length === 0 ? (
                      <span className="text-ink-muted">Vacant</span>
                    ) : (
                      room.occupants.map((occupant) => (
                        <div key={occupant.id} className="min-w-0">
                          <OccupantRow
                            occupant={occupant}
                            onOccupantClick={onOccupantClick}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {showInlineRoster ? (
        <ul className="mt-0.5 space-y-0.5" role="list">
          {roster!.rooms.map((room) => (
            <li key={room.id} className="flex items-start gap-1.5 text-[10px] leading-snug">
              <span className="w-3 shrink-0 font-semibold tabular-nums text-ink">
                {room.index}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                {room.vacant || room.occupants.length === 0 ? (
                  <span className="text-ink-muted">Vacant</span>
                ) : (
                  room.occupants.map((occupant) => (
                    <div key={occupant.id} className="min-w-0">
                      <OccupantRow
                        occupant={occupant}
                        onOccupantClick={onOccupantClick}
                      />
                    </div>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!roster ? (
        <ul className="space-y-0.5 text-[10px] font-medium normal-case leading-snug tracking-normal text-ink/85">
          {shareDetail.summaryLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export {
  clientOccupancyTagProps,
  resolveArrangementDisplayDetail,
  resolveArrangementDisplayTitle,
  resolveArrangementTenantLabel,
}
