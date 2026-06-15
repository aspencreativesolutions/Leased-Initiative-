import { useState, type MouseEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatDate } from '@/lib/utils'
import {
  formatScheduleTime,
  formatScheduleTimeRange,
  formatScheduleTimeRangeCompact,
  getDayLabels,
  getHourLabelTopPercent,
  getMobileTimelineRowTemplate,
  MOBILE_TIMELINE_ROWS,
  moveScheduleBlock,
  SCHEDULE_GRID_HEIGHT_PX,
  SCHEDULE_HOUR_MARKS,
  showRowEndBorder,
  showRowStartBorder,
} from '@/lib/scheduler'
import { ScheduleBlockActionMenu, type ScheduleBlockActionAnchor } from './ScheduleBlockActionMenu'
import { ScheduleMoveBanner } from './ScheduleMoveBanner'
import {
  ServiceTierBadge,
  serviceTierBlockStyle,
  serviceTierFaintTextClass,
  serviceTierMutedTextClass,
  serviceTierOnDarkTextClass,
} from './ServiceTierBadge'
import { migrateServiceTier } from '@/lib/serviceTiers'
import type { ScheduleBlock, WeekSchedule } from '@/types'

const tierBlockStyle = {
  Summit: serviceTierBlockStyle('Summit'),
  Studio: serviceTierBlockStyle('Studio'),
  Launch: serviceTierBlockStyle('Launch'),
}

function getDayBlocks(schedule: WeekSchedule, dayIndex: number): ScheduleBlock[] {
  return schedule.blocks.filter((b) => b.dayIndex === dayIndex)
}

interface MobileWeeklySchedulerProps {
  schedule: WeekSchedule
  onDaySelect?: (dayIndex: number | null) => void
  onScheduleChange?: (schedule: WeekSchedule) => void
}

function rowBorderClass(
  rowIndex: number,
  startTime: string,
  endTime: string,
  nextStartTime?: string
) {
  return cn(
    showRowStartBorder(startTime, rowIndex) && 'border-t border-line/70',
    showRowEndBorder(endTime, nextStartTime) && 'border-b border-line/70'
  )
}

function HourGutter({ dense }: { dense?: boolean }) {
  return (
    <div
      className={cn(
        'relative shrink-0 self-stretch border-r border-line bg-surface-paper',
        dense ? 'w-7' : 'w-[3.25rem]'
      )}
      style={{ minHeight: SCHEDULE_GRID_HEIGHT_PX }}
    >
      {SCHEDULE_HOUR_MARKS.map((hour) => {
        const topPercent = getHourLabelTopPercent(hour)
        return (
          <span
            key={hour}
            className={cn(
              'absolute left-0 right-0 font-semibold leading-none text-ink',
              dense ? 'px-0.5 text-[7px]' : 'px-1 text-[9px]'
            )}
            style={{
              top: `${topPercent}%`,
              transform:
                topPercent <= 0 ? 'translateY(0)' : topPercent >= 100 ? 'translateY(-100%)' : 'translateY(-50%)',
            }}
          >
            {formatScheduleTime(`${hour}:00`)}
          </span>
        )
      })}
    </div>
  )
}

function TimelineSlotContent({
  block,
  dense,
  isMoving,
  onClick,
}: {
  block: ScheduleBlock
  dense?: boolean
  isMoving?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  const isLunch = block.blockType === 'lunch'
  const hasClient = Boolean(block.clientId)

  const timeRange = dense
    ? formatScheduleTimeRangeCompact(block.startTime, block.endTime)
    : formatScheduleTimeRange(block.startTime, block.endTime)

  const tier = block.serviceTier ? migrateServiceTier(block.serviceTier) : undefined

  const content = isLunch ? (
    <span className={cn('font-bold uppercase tracking-caps', dense ? 'text-[7px]' : 'text-[10px]')}>
      Lunch
    </span>
  ) : hasClient ? (
    <>
      <p
        className={cn(
          'break-words font-bold leading-snug',
          dense ? 'text-[8px]' : 'text-sm',
          serviceTierOnDarkTextClass(tier)
        )}
      >
        {block.businessName}
      </p>
      {block.label && (
        <p
          className={cn(
            'break-words font-semibold leading-snug',
            dense ? 'mt-0.5 text-[7px]' : 'mt-0.5 text-[11px]',
            serviceTierMutedTextClass(tier)
          )}
        >
          {block.label}
        </p>
      )}
      <p
        className={cn(
          'whitespace-nowrap font-semibold leading-none',
          dense ? 'mt-0.5 text-[7px]' : 'mt-1 text-[11px]',
          serviceTierFaintTextClass(tier)
        )}
      >
        {timeRange}
      </p>
    </>
  ) : null

  if (!content) return null

  const className = cn(
    'relative z-10 flex h-full min-h-full w-full flex-1 flex-col border text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
    dense ? 'px-1.5 py-1' : 'px-2 py-1.5',
    onClick && hasClient && 'cursor-pointer hover:brightness-95',
    isMoving && 'ring-2 ring-brand ring-offset-1',
    isLunch && 'items-center justify-center',
    isLunch
      ? 'border-ink-muted/60 bg-surface text-ink-muted'
      : tier
        ? tierBlockStyle[tier]
        : 'border-ink-muted/60 bg-surface-paper text-ink'
  )

  if (onClick && hasClient) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

function TimelineDaySlot({
  schedule,
  dayIndex,
  rowIndex,
  row,
  nextStartTime,
  dense,
  movingBlockId,
  onBlockClick,
  onMoveToSlot,
}: {
  schedule: WeekSchedule
  dayIndex: number
  rowIndex: number
  row: (typeof MOBILE_TIMELINE_ROWS)[number]
  nextStartTime?: string
  dense?: boolean
  movingBlockId?: string | null
  onBlockClick?: (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => void
  onMoveToSlot?: (dayIndex: number, startTime: string) => void
}) {
  const dayBlocks = getDayBlocks(schedule, dayIndex)
  const block = dayBlocks.find((b) => b.startTime === row.startTime && b.blockType === row.blockType)
  const moveMode = Boolean(movingBlockId && onMoveToSlot && row.blockType === 'work')
  const borders = rowBorderClass(rowIndex, row.startTime, row.endTime, nextStartTime)

  if (moveMode) {
    const slotBlock = dayBlocks.find((b) => b.blockType === 'work' && b.startTime === row.startTime)
    if (!slotBlock) {
      return (
        <div
          className={cn(
            'relative h-full min-h-0 min-w-0 border-r border-line bg-surface-paper last:border-r-0',
            borders
          )}
        />
      )
    }

    if (slotBlock.id === movingBlockId) {
      return (
        <div
          className={cn(
            'relative flex h-full min-h-0 min-w-0 flex-col border-r border-line bg-surface-paper last:border-r-0',
            borders
          )}
        >
          <TimelineSlotContent block={slotBlock} dense={dense} isMoving />
        </div>
      )
    }

    return (
      <div
        className={cn(
          'relative flex h-full min-h-0 min-w-0 flex-col border-r border-line bg-surface-paper p-0.5 last:border-r-0',
          borders
        )}
      >
        <button
          type="button"
          onClick={() => onMoveToSlot!(dayIndex, row.startTime)}
          className={cn(
            'flex h-full min-h-full w-full items-center justify-center border border-dashed border-brand bg-brand/15 font-bold uppercase tracking-caps text-brand hover:bg-brand/25',
            dense ? 'px-1 py-1 text-[6px]' : 'px-2 py-2 text-[9px]'
          )}
        >
          {slotBlock.clientId ? 'Swap' : 'Move here'}
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 min-w-0 flex-col border-r border-line bg-surface-paper last:border-r-0',
        borders
      )}
    >
      {block?.blockType === 'lunch' && <TimelineSlotContent block={block} dense={dense} />}
      {block?.blockType === 'work' && block.clientId && (
        <TimelineSlotContent
          block={block}
          dense={dense}
          isMoving={movingBlockId === block.id}
          onClick={onBlockClick ? (event) => onBlockClick(block, event) : undefined}
        />
      )}
    </div>
  )
}

function TimelineGrid({
  schedule,
  dayIndices,
  dense,
  movingBlockId,
  onBlockClick,
  onMoveToSlot,
}: {
  schedule: WeekSchedule
  dayIndices: number[]
  dense?: boolean
  movingBlockId?: string | null
  onBlockClick?: (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => void
  onMoveToSlot?: (dayIndex: number, startTime: string) => void
}) {
  const rowTemplate = getMobileTimelineRowTemplate(dense)

  return (
    <div className="flex min-w-0 flex-1 items-stretch">
      <HourGutter dense={dense} />
      <div
        className="grid min-w-0 flex-1 items-stretch bg-surface-paper"
        style={{
          gridTemplateColumns: `repeat(${dayIndices.length}, minmax(0, 1fr))`,
          gridTemplateRows: rowTemplate,
        }}
      >
        {MOBILE_TIMELINE_ROWS.flatMap((row, rowIndex) => {
          const nextStartTime = MOBILE_TIMELINE_ROWS[rowIndex + 1]?.startTime
          return dayIndices.map((dayIndex) => (
            <TimelineDaySlot
              key={`${dayIndex}-${row.startTime}`}
              schedule={schedule}
              dayIndex={dayIndex}
              rowIndex={rowIndex}
              row={row}
              nextStartTime={nextStartTime}
              dense={dense}
              movingBlockId={movingBlockId}
              onBlockClick={onBlockClick}
              onMoveToSlot={onMoveToSlot}
            />
          ))
        })}
      </div>
    </div>
  )
}

function MobileDayDetail({
  schedule,
  dayIndex,
  weekDates,
  movingBlockId,
  onShowWeek,
  onSelectDay,
  onBlockClick,
  onMoveToSlot,
  onCancelMove,
}: {
  schedule: WeekSchedule
  dayIndex: number
  weekDates: string[]
  movingBlockId?: string | null
  onShowWeek: () => void
  onSelectDay: (index: number) => void
  onBlockClick: (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => void
  onMoveToSlot?: (dayIndex: number, startTime: string) => void
  onCancelMove: () => void
}) {
  const days = getDayLabels()
  const dayBlocks = getDayBlocks(schedule, dayIndex)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={onShowWeek}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Week
        </Button>
        <p className="truncate text-sm font-semibold text-ink">
          {days[dayIndex]} · {weekDates[dayIndex]}
        </p>
      </div>

      {movingBlockId && <ScheduleMoveBanner onCancel={onCancelMove} />}

      <div className="mb-3 grid grid-cols-5 gap-1">
        {days.map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(index)}
            className={cn(
              'rounded-sm border px-1 py-1.5 text-center transition-colors',
              index === dayIndex
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-line bg-surface-paper text-ink-muted'
            )}
          >
            <span className="block text-[9px] font-bold uppercase">{day.slice(0, 3)}</span>
            <span className="block text-[8px]">{weekDates[index]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-sm border border-line">
        <TimelineGrid
          schedule={schedule}
          dayIndices={[dayIndex]}
          movingBlockId={movingBlockId}
          onBlockClick={onBlockClick}
          onMoveToSlot={onMoveToSlot}
        />
      </div>

      <div className="mt-3 space-y-2">
        {dayBlocks
          .filter((b) => b.blockType === 'work' && b.clientId)
          .map((block) => (
            <button
              key={block.id}
              type="button"
              onClick={(event) => onBlockClick(block, event)}
              className={cn(
                'grid w-full grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border px-2 py-2 text-left',
                block.serviceTier ? tierBlockStyle[migrateServiceTier(block.serviceTier)] : 'border-ink-muted/60 bg-surface-paper'
              )}
            >
              <span className="self-center text-[10px] font-bold leading-tight">
                {formatScheduleTimeRange(block.startTime, block.endTime)}
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-bold">{block.businessName}</span>
                {block.label && (
                  <span className="block break-words text-xs opacity-80">{block.label}</span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  {block.serviceTier && (
                    <ServiceTierBadge tier={migrateServiceTier(block.serviceTier)} small />
                  )}
                  {block.deadlineDate && (
                    <span className="text-[9px] uppercase tracking-caps opacity-80">
                      Due {formatDate(block.deadlineDate)}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}

function MobileWeekGrid({
  schedule,
  weekDates,
  movingBlockId,
  onSelectDay,
  onBlockClick,
  onMoveToSlot,
  onCancelMove,
}: {
  schedule: WeekSchedule
  weekDates: string[]
  movingBlockId?: string | null
  onSelectDay: (dayIndex: number) => void
  onBlockClick: (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => void
  onMoveToSlot?: (dayIndex: number, startTime: string) => void
  onCancelMove: () => void
}) {
  const days = getDayLabels()

  return (
    <div>
      {movingBlockId && <ScheduleMoveBanner onCancel={onCancelMove} />}
      <div className="overflow-hidden rounded-sm border border-line">
        <div className="grid grid-cols-[1.75rem_repeat(5,minmax(0,1fr))] border-b border-line bg-surface">
          <div />
          {days.map((day, dayIndex) => (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(dayIndex)}
              className="border-r border-line px-0.5 py-1 text-center last:border-r-0 hover:bg-surface-paper"
            >
              <span className="block text-[8px] font-bold uppercase leading-none text-ink">
                {day.slice(0, 3)}
              </span>
              <span className="mt-0.5 block text-[7px] leading-none text-ink-muted">
                {weekDates[dayIndex]}
              </span>
            </button>
          ))}
        </div>

        <TimelineGrid
          schedule={schedule}
          dayIndices={days.map((_, index) => index)}
          dense
          movingBlockId={movingBlockId}
          onBlockClick={onBlockClick}
          onMoveToSlot={onMoveToSlot}
        />
      </div>
    </div>
  )
}

export function MobileWeeklyScheduler({
  schedule,
  onDaySelect,
  onScheduleChange,
}: MobileWeeklySchedulerProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [actionAnchor, setActionAnchor] = useState<ScheduleBlockActionAnchor | null>(null)
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null)
  const days = getDayLabels()

  const selectDay = (index: number | null) => {
    setSelectedDayIndex(index)
    onDaySelect?.(index)
  }

  const handleBlockClick = (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => {
    if (movingBlockId) return
    setActionAnchor({ block, rect: event.currentTarget.getBoundingClientRect() })
  }

  const handleStartMove = (block: ScheduleBlock) => {
    setActionAnchor(null)
    setMovingBlockId(block.id)
  }

  const handleMoveToSlot = (dayIndex: number, startTime: string) => {
    if (!movingBlockId || !onScheduleChange) return
    const next = moveScheduleBlock(schedule, movingBlockId, dayIndex, startTime)
    if (next) onScheduleChange(next)
    setMovingBlockId(null)
  }

  const weekDates = days.map((_, i) => {
    const d = new Date(schedule.weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  return (
    <>
      {selectedDayIndex !== null ? (
        <MobileDayDetail
          schedule={schedule}
          dayIndex={selectedDayIndex}
          weekDates={weekDates}
          movingBlockId={movingBlockId}
          onShowWeek={() => selectDay(null)}
          onSelectDay={selectDay}
          onBlockClick={handleBlockClick}
          onMoveToSlot={onScheduleChange ? handleMoveToSlot : undefined}
          onCancelMove={() => setMovingBlockId(null)}
        />
      ) : (
        <MobileWeekGrid
          schedule={schedule}
          weekDates={weekDates}
          movingBlockId={movingBlockId}
          onSelectDay={selectDay}
          onBlockClick={handleBlockClick}
          onMoveToSlot={onScheduleChange ? handleMoveToSlot : undefined}
          onCancelMove={() => setMovingBlockId(null)}
        />
      )}

      <ScheduleBlockActionMenu
        anchor={actionAnchor}
        onClose={() => setActionAnchor(null)}
        onMove={onScheduleChange ? handleStartMove : undefined}
      />
    </>
  )
}
