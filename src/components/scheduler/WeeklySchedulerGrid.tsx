import { useRef, useState, type MouseEvent } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { DAILY_TIMELINE, formatScheduleTimeRange, getDayLabels, moveScheduleBlock } from '@/lib/scheduler'
import { MobileWeeklyScheduler } from './MobileWeeklyScheduler'
import { ScheduleBlockActionMenu, type ScheduleBlockActionAnchor } from './ScheduleBlockActionMenu'
import { ScheduleMoveBanner } from './ScheduleMoveBanner'
import {
  ServiceTierBadge,
  serviceTierBlockStyle,
  serviceTierFaintTextClass,
  serviceTierMutedTextClass,
} from './ServiceTierBadge'
import { isTopServiceTier, migrateServiceTier } from '@/lib/serviceTiers'
import type { ScheduleBlock, WeekSchedule } from '@/types'

const DRAG_MIME = 'application/x-schedule-block'

interface WeeklySchedulerGridProps {
  schedule: WeekSchedule
  onScheduleChange?: (schedule: WeekSchedule) => void
}

function blockForDay(schedule: WeekSchedule, dayIndex: number, startTime: string): ScheduleBlock | undefined {
  return schedule.blocks.find((b) => b.dayIndex === dayIndex && b.startTime === startTime)
}

const tierBlockStyle = {
  Summit: serviceTierBlockStyle('Summit'),
  Studio: serviceTierBlockStyle('Studio'),
  Launch: serviceTierBlockStyle('Launch'),
}

interface AppointmentBlockProps {
  block: ScheduleBlock
  isDragging: boolean
  isDropTarget: boolean
  isMoving: boolean
  onDragStart: (blockId: string) => void
  onDragEnd: () => void
  onBlockClick: (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => void
}

function AppointmentBlock({
  block,
  isDragging,
  isDropTarget,
  isMoving,
  onDragStart,
  onDragEnd,
  onBlockClick,
}: AppointmentBlockProps) {
  const didDrag = useRef(false)
  const tier = block.serviceTier ? migrateServiceTier(block.serviceTier) : undefined
  const tierClass = tier ? tierBlockStyle[tier] : ''

  return (
    <div
      draggable
      onDragStart={(event) => {
        didDrag.current = false
        event.dataTransfer.setData(DRAG_MIME, block.id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(block.id)
      }}
      onDrag={() => {
        didDrag.current = true
      }}
      onDragEnd={() => {
        onDragEnd()
        window.setTimeout(() => {
          didDrag.current = false
        }, 0)
      }}
      onClick={(event) => {
        if (didDrag.current || !block.clientId) return
        onBlockClick(block, event)
      }}
      className={cn(
        'block cursor-grab border px-2.5 py-2 transition-colors active:cursor-grabbing',
        tierClass,
        isDragging && 'opacity-40',
        isMoving && 'ring-2 ring-brand ring-offset-1',
        isDropTarget && 'ring-2 ring-brand ring-offset-1'
      )}
    >
      <p className="break-words text-xs font-semibold leading-tight">{block.businessName}</p>
      {block.label && (
        <p
          className={cn(
            'mt-0.5 break-words text-[11px] leading-tight',
            serviceTierMutedTextClass(tier)
          )}
        >
          {block.label}
        </p>
      )}
      <p
        className={cn(
          'mt-1 whitespace-nowrap text-[10px] leading-none',
          serviceTierFaintTextClass(tier)
        )}
      >
        {formatScheduleTimeRange(block.startTime, block.endTime)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {tier && !isTopServiceTier(tier) && (
          <ServiceTierBadge tier={tier} small />
        )}
        {block.deadlineDate && (
          <span
            className={cn(
              'text-[10px] uppercase tracking-caps',
              serviceTierFaintTextClass(tier)
            )}
          >
            Due {formatDate(block.deadlineDate)}
          </span>
        )}
      </div>
    </div>
  )
}

export function WeeklySchedulerGrid({ schedule, onScheduleChange }: WeeklySchedulerGridProps) {
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [actionAnchor, setActionAnchor] = useState<ScheduleBlockActionAnchor | null>(null)
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null)
  const days = getDayLabels()
  const draggingBlock = draggingBlockId
    ? schedule.blocks.find((block) => block.id === draggingBlockId)
    : undefined

  const weekDates = days.map((_, i) => {
    const d = new Date(schedule.weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  const handleDrop = (sourceBlockId: string, targetDayIndex: number, targetStartTime: string) => {
    if (!onScheduleChange) return
    const next = moveScheduleBlock(schedule, sourceBlockId, targetDayIndex, targetStartTime)
    if (next) onScheduleChange(next)
    setDraggingBlockId(null)
    setMovingBlockId(null)
  }

  const handleStartMove = (block: ScheduleBlock) => {
    setActionAnchor(null)
    setMovingBlockId(block.id)
  }

  const handleBlockClick = (block: ScheduleBlock, event: MouseEvent<HTMLElement>) => {
    setActionAnchor({ block, rect: event.currentTarget.getBoundingClientRect() })
  }

  return (
    <>
      <div className="md:hidden rounded-sm border-2 border-ink/10 bg-surface-paper p-2">
        <MobileWeeklyScheduler schedule={schedule} onScheduleChange={onScheduleChange} />
      </div>

      <div className="hidden md:block">
        {movingBlockId && (
          <ScheduleMoveBanner onCancel={() => setMovingBlockId(null)} />
        )}
        <div className="overflow-x-auto rounded-sm border-2 border-ink/10 bg-surface-paper">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-ink text-surface-paper">
                <th className="sticky left-0 z-10 w-28 bg-ink px-3 py-3 text-left label-caps !text-surface-paper/70">
                  Time
                </th>
                {days.map((day, i) => (
                  <th key={day} className="min-w-[140px] px-2 py-3 text-left">
                    <div className="font-display text-base font-semibold">{day}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-caps text-surface-paper/50">
                      {weekDates[i]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAILY_TIMELINE.map((row) => (
                <tr key={row.startTime} className="border-b border-line">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r-2 border-line bg-surface-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                    {formatScheduleTimeRange(row.startTime, row.endTime)}
                  </td>
                  {days.map((_, dayIndex) => {
                    const block = blockForDay(schedule, dayIndex, row.startTime)!
                    if (block.blockType === 'lunch') {
                      return (
                        <td key={dayIndex} className="px-2 py-1.5">
                          <div className="border border-ink-muted/60 bg-surface px-2 py-2 text-center text-[10px] font-bold uppercase tracking-caps text-ink-muted">
                            Lunch
                          </div>
                        </td>
                      )
                    }
                    if (block.blockType === 'buffer') {
                      return (
                        <td key={dayIndex} className="px-2 py-1">
                          <div className="flex h-8 items-center justify-center rounded-sm border border-dashed border-line text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                            —
                          </div>
                        </td>
                      )
                    }

                    const hasClient = Boolean(block.clientId)
                    const isValidDropTarget =
                      (Boolean(draggingBlock) && draggingBlock!.id !== block.id) ||
                      (Boolean(movingBlockId) && movingBlockId !== block.id)

                    return (
                      <td
                        key={dayIndex}
                        className="px-2 py-1.5"
                        onDragOver={(event) => {
                          if (!draggingBlock || draggingBlock.id === block.id) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(event) => {
                          if (!draggingBlock || draggingBlock.id === block.id) return
                          event.preventDefault()
                          const blockId = event.dataTransfer.getData(DRAG_MIME)
                          if (!blockId) return
                          handleDrop(blockId, dayIndex, row.startTime)
                        }}
                      >
                        {hasClient ? (
                          movingBlockId && movingBlockId !== block.id ? (
                            <button
                              type="button"
                              onClick={() => handleDrop(movingBlockId, dayIndex, row.startTime)}
                              className="flex min-h-[72px] w-full items-center justify-center border border-dashed border-brand bg-brand/10 text-[10px] font-semibold uppercase tracking-caps text-brand hover:bg-brand/20"
                            >
                              {block.clientId ? 'Swap here' : 'Move here'}
                            </button>
                          ) : (
                            <AppointmentBlock
                              block={block}
                              isDragging={draggingBlockId === block.id}
                              isDropTarget={Boolean(draggingBlock) && draggingBlock!.id !== block.id}
                              isMoving={movingBlockId === block.id}
                              onDragStart={setDraggingBlockId}
                              onDragEnd={() => setDraggingBlockId(null)}
                              onBlockClick={handleBlockClick}
                            />
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={!movingBlockId}
                            onClick={() => {
                              if (!movingBlockId) return
                              handleDrop(movingBlockId, dayIndex, row.startTime)
                            }}
                            className={cn(
                              'flex h-[72px] w-full items-center justify-center border-2 border-dashed text-[10px] font-semibold uppercase tracking-caps transition-colors',
                              isValidDropTarget
                                ? 'border-brand bg-brand/10 text-brand hover:bg-brand/20'
                                : 'cursor-default border-line text-ink-faint/50'
                            )}
                          >
                            {isValidDropTarget ? 'Move here' : 'Open'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleBlockActionMenu
        anchor={actionAnchor}
        onClose={() => setActionAnchor(null)}
        onMove={onScheduleChange ? handleStartMove : undefined}
      />
    </>
  )
}
