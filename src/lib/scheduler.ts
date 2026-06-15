import {
  DEFAULT_SERVICE_TIER,
  SERVICE_TIERS,
  TIER_PRIORITY,
  migrateServiceTier,
} from '@/lib/serviceTiers'
import type { Client, ContractData, ScheduleBlock, ServiceTier, WeekSchedule } from '@/types'

export { DEFAULT_SERVICE_TIER, SERVICE_TIERS, TIER_PRIORITY }

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

/** Work slots per day (Mon–Fri). Buffers and lunch are separate rows. */
export const DAILY_TIMELINE: Omit<ScheduleBlock, 'id' | 'dayIndex'>[] = [
  { blockType: 'work', startTime: '09:00', endTime: '10:00' },
  { blockType: 'buffer', startTime: '10:00', endTime: '10:15', label: 'Buffer' },
  { blockType: 'work', startTime: '10:15', endTime: '11:15' },
  { blockType: 'buffer', startTime: '11:15', endTime: '11:30', label: 'Buffer' },
  { blockType: 'work', startTime: '11:30', endTime: '12:00' },
  { blockType: 'lunch', startTime: '12:00', endTime: '13:00', label: 'Lunch Break' },
  { blockType: 'work', startTime: '13:00', endTime: '14:00' },
  { blockType: 'buffer', startTime: '14:00', endTime: '14:15', label: 'Buffer' },
  { blockType: 'work', startTime: '14:15', endTime: '15:15' },
  { blockType: 'buffer', startTime: '15:15', endTime: '15:30', label: 'Buffer' },
  { blockType: 'work', startTime: '15:30', endTime: '16:00' },
]

export function getDayLabels(): readonly string[] {
  return DAY_LABELS
}

/** Work + lunch rows for mobile timeline grids (buffers omitted). */
export const MOBILE_TIMELINE_ROWS = DAILY_TIMELINE.filter(
  (row) => row.blockType === 'work' || row.blockType === 'lunch'
)

export function getSlotMinHeightPx(startTime: string, endTime: string, dense = false): number {
  const duration = timeToScheduleMinutes(endTime) - timeToScheduleMinutes(startTime)
  const scale = dense ? 0.9 : 1
  const proportional = (duration / SCHEDULE_DAY_SPAN_MINUTES) * SCHEDULE_GRID_HEIGHT_PX * scale
  return Math.max(dense ? 28 : 36, Math.round(proportional))
}

export function getMobileTimelineRowTemplate(dense = false): string {
  return MOBILE_TIMELINE_ROWS.map((row) => {
    const minPx = getSlotMinHeightPx(row.startTime, row.endTime, dense)
    return `minmax(${minPx}px, auto)`
  }).join(' ')
}

/** Work-only rows for move targets */
export function getWorkTimelineRows(): Omit<ScheduleBlock, 'id' | 'dayIndex'>[] {
  return DAILY_TIMELINE.filter((row) => row.blockType === 'work')
}

export function formatScheduleTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m)
  if (m === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatScheduleTimeRange(start: string, end: string): string {
  return `${formatScheduleTime(start)} – ${formatScheduleTime(end)}`
}

/** Same meridiem collapsed to one suffix, e.g. "9 – 10 AM" */
export function formatScheduleTimeRangeCompact(start: string, end: string): string {
  const startFormatted = formatScheduleTime(start)
  const endFormatted = formatScheduleTime(end)
  const startMatch = startFormatted.match(/^(.+)\s(AM|PM)$/i)
  const endMatch = endFormatted.match(/^(.+)\s(AM|PM)$/i)
  if (startMatch && endMatch && startMatch[2].toUpperCase() === endMatch[2].toUpperCase()) {
    return `${startMatch[1]} – ${endMatch[1]} ${startMatch[2].toUpperCase()}`
  }
  return `${startFormatted} – ${endFormatted}`
}

const SCHEDULE_DAY_START_MINUTES = 9 * 60
const SCHEDULE_DAY_END_MINUTES = 16 * 60
export const SCHEDULE_DAY_SPAN_MINUTES = SCHEDULE_DAY_END_MINUTES - SCHEDULE_DAY_START_MINUTES
export const SCHEDULE_GRID_HOUR_COUNT = 7
export const SCHEDULE_GRID_HEIGHT_PX = SCHEDULE_GRID_HOUR_COUNT * 48
export const SCHEDULE_HOUR_MARKS = [9, 10, 11, 12, 13, 14, 15, 16] as const

export function getHourLabelTopPercent(hour: number): number {
  const minutes = hour * 60 - SCHEDULE_DAY_START_MINUTES
  return (minutes / SCHEDULE_DAY_SPAN_MINUTES) * 100
}

export function timeToScheduleMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getHourMarksForRow(
  startTime: string,
  endTime: string,
  nextStartTime?: string
): { hour: number; topPercent: number }[] {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const marks: { hour: number; topPercent: number }[] = []
  const isHourMark = (hour: number) => (SCHEDULE_HOUR_MARKS as readonly number[]).includes(hour)

  if (startM === 0 && isHourMark(startH)) {
    marks.push({ hour: startH, topPercent: 0 })
  }

  if (endM === 0 && isHourMark(endH) && nextStartTime !== endTime) {
    marks.push({ hour: endH, topPercent: 100 })
  }

  return marks
}

export function showRowStartBorder(startTime: string, rowIndex: number): boolean {
  const [, startM] = startTime.split(':').map(Number)
  return startM === 0 && rowIndex > 0
}

export function showRowEndBorder(endTime: string, nextStartTime?: string): boolean {
  const [, endM] = endTime.split(':').map(Number)
  return endM === 0 && nextStartTime !== endTime
}

export function getScheduleBlockPosition(startTime: string, endTime: string) {
  const start = timeToScheduleMinutes(startTime) - SCHEDULE_DAY_START_MINUTES
  const end = timeToScheduleMinutes(endTime) - SCHEDULE_DAY_START_MINUTES
  return {
    topPercent: (start / SCHEDULE_DAY_SPAN_MINUTES) * 100,
    heightPercent: ((end - start) / SCHEDULE_DAY_SPAN_MINUTES) * 100,
  }
}

export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function formatWeekStart(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`
}

export function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return formatWeekStart(d)
}

interface SchedulableTask {
  id: string
  clientId: string
  clientName: string
  businessName: string
  serviceTier: ServiceTier
  label: string
  deadlineDate: string
  sortKey: number
}

const ACTIVE_STATUSES = new Set([
  'In Progress',
  'Contract Sent',
  'Contract Signed',
  'Follow-Up Needed',
])

function isDateInWeek(dateStr: string, weekStart: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  return d >= start && d <= end
}

function isOverdueOrThisWeek(dateStr: string, weekStart: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  return d <= end
}

function collectTasks(
  clients: Client[],
  contracts: ContractData[],
  weekStart: string
): SchedulableTask[] {
  const tasks: SchedulableTask[] = []
  const contractByClient = new Map(contracts.map((c) => [c.clientId, c]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const client of clients) {
    if (!ACTIVE_STATUSES.has(client.projectStatus)) continue

    const contract = contractByClient.get(client.id)
    const tier: ServiceTier = migrateServiceTier(contract?.serviceTier ?? client.serviceTier)

    const addTask = (id: string, label: string, deadlineDate: string) => {
      if (!isOverdueOrThisWeek(deadlineDate, weekStart)) return
      const due = new Date(deadlineDate + 'T12:00:00')
      const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000)
      const urgency = daysUntil < 0 ? -1000 + daysUntil : daysUntil
      tasks.push({
        id,
        clientId: client.id,
        clientName: client.name,
        businessName: client.businessName,
        serviceTier: tier,
        label,
        deadlineDate,
        sortKey: TIER_PRIORITY[tier] * 10000 + urgency,
      })
    }

    if (client.followUpDate) {
      addTask(`follow-${client.id}`, 'Follow-up', client.followUpDate)
    }

    for (const dl of client.deadlines) {
      if (dl.completed) continue
      addTask(dl.id, dl.label, dl.date)
    }

    if (contract?.completionDate && isDateInWeek(contract.completionDate, weekStart)) {
      addTask(
        `completion-${client.id}`,
        `Project due: ${contract.projectTitle}`,
        contract.completionDate
      )
    }
  }

  return tasks.sort((a, b) => a.sortKey - b.sortKey)
}

function buildEmptyWeek(weekStart: string): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = []
  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    for (const row of DAILY_TIMELINE) {
      blocks.push({
        id: `${weekStart}-d${dayIndex}-${row.startTime}`,
        dayIndex,
        ...row,
        label: row.label,
      })
    }
  }
  return blocks
}

function getWorkSlotIndicesByDay(blocks: ScheduleBlock[]): number[][] {
  const byDay: number[][] = [[], [], [], [], []]
  blocks.forEach((block, index) => {
    if (block.blockType === 'work') byDay[block.dayIndex].push(index)
  })
  return byDay
}

function assignTasksAcrossWeek(blocks: ScheduleBlock[], tasks: SchedulableTask[]): void {
  const slotsByDay = getWorkSlotIndicesByDay(blocks)
  const dayPointers = [0, 0, 0, 0, 0]
  let nextDay = 0

  for (const task of tasks) {
    let placed = false

    for (let offset = 0; offset < 5; offset++) {
      const dayIndex = (nextDay + offset) % 5
      const pointer = dayPointers[dayIndex]
      const daySlots = slotsByDay[dayIndex]

      if (pointer >= daySlots.length) continue

      const blockIndex = daySlots[pointer]
      blocks[blockIndex] = {
        ...blocks[blockIndex],
        clientId: task.clientId,
        clientName: task.clientName,
        businessName: task.businessName,
        serviceTier: task.serviceTier,
        label: task.label,
        deadlineDate: task.deadlineDate,
      }
      dayPointers[dayIndex] = pointer + 1
      nextDay = (dayIndex + 1) % 5
      placed = true
      break
    }

    if (!placed) break
  }
}

export function generateWeekSchedule(
  weekStart: string,
  clients: Client[],
  contracts: ContractData[]
): WeekSchedule {
  const blocks = buildEmptyWeek(weekStart)
  const tasks = collectTasks(clients, contracts, weekStart)
  assignTasksAcrossWeek(blocks, tasks)

  return {
    weekStart,
    blocks,
    generatedAt: new Date().toISOString(),
  }
}

export function countScheduledTasks(schedule: WeekSchedule): number {
  return schedule.blocks.filter((b) => b.blockType === 'work' && b.clientId).length
}

export function countScheduledClients(schedule: WeekSchedule): number {
  const ids = new Set(
    schedule.blocks.filter((b) => b.blockType === 'work' && b.clientId).map((b) => b.clientId)
  )
  return ids.size
}

export function tierCounts(schedule: WeekSchedule): Record<ServiceTier, number> {
  const counts: Record<ServiceTier, number> = {
    Summit: 0,
    Studio: 0,
    Launch: 0,
  }
  for (const b of schedule.blocks) {
    if (b.blockType === 'work' && b.serviceTier) {
      counts[migrateServiceTier(b.serviceTier)]++
    }
  }
  return counts
}

type ClientAssignment = Pick<
  ScheduleBlock,
  'clientId' | 'clientName' | 'businessName' | 'serviceTier' | 'label' | 'deadlineDate'
>

function pickClientAssignment(block: ScheduleBlock): ClientAssignment {
  return {
    clientId: block.clientId,
    clientName: block.clientName,
    businessName: block.businessName,
    serviceTier: block.serviceTier,
    label: block.label,
    deadlineDate: block.deadlineDate,
  }
}

function clearClientAssignment(block: ScheduleBlock): ScheduleBlock {
  const next = { ...block }
  delete next.clientId
  delete next.clientName
  delete next.businessName
  delete next.serviceTier
  delete next.label
  delete next.deadlineDate
  return next
}

function applyClientAssignment(block: ScheduleBlock, assignment: ClientAssignment): ScheduleBlock {
  return {
    ...clearClientAssignment(block),
    ...(assignment.clientId !== undefined ? { clientId: assignment.clientId } : {}),
    ...(assignment.clientName !== undefined ? { clientName: assignment.clientName } : {}),
    ...(assignment.businessName !== undefined ? { businessName: assignment.businessName } : {}),
    ...(assignment.serviceTier !== undefined ? { serviceTier: assignment.serviceTier } : {}),
    ...(assignment.label !== undefined ? { label: assignment.label } : {}),
    ...(assignment.deadlineDate !== undefined ? { deadlineDate: assignment.deadlineDate } : {}),
  }
}

/** Move (or swap) a scheduled client to another work slot. */
export function moveScheduleBlock(
  schedule: WeekSchedule,
  sourceBlockId: string,
  targetDayIndex: number,
  targetStartTime: string
): WeekSchedule | null {
  const sourceIndex = schedule.blocks.findIndex((block) => block.id === sourceBlockId)
  const targetIndex = schedule.blocks.findIndex(
    (block) => block.dayIndex === targetDayIndex && block.startTime === targetStartTime
  )
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null

  const source = schedule.blocks[sourceIndex]
  const target = schedule.blocks[targetIndex]
  if (source.blockType !== 'work' || !source.clientId) return null
  if (target.blockType !== 'work') return null

  const sourceAssignment = pickClientAssignment(source)
  const targetAssignment = pickClientAssignment(target)

  const blocks = schedule.blocks.map((block, index) => {
    if (index === targetIndex) return applyClientAssignment(block, sourceAssignment)
    if (index === sourceIndex) {
      return target.clientId
        ? applyClientAssignment(block, targetAssignment)
        : clearClientAssignment(block)
    }
    return block
  })

  return { ...schedule, blocks }
}
