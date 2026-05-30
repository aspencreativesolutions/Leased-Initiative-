import type { Client, ContractData, ScheduleBlock, ServiceTier, WeekSchedule } from '@/types'

export const TIER_PRIORITY: Record<ServiceTier, number> = {
  'Premium Custom': 0,
  Business: 1,
  Starter: 2,
}

export const SERVICE_TIERS: ServiceTier[] = ['Starter', 'Business', 'Premium Custom']

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
    const tier: ServiceTier = contract?.serviceTier ?? 'Starter'

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

export function generateWeekSchedule(
  weekStart: string,
  clients: Client[],
  contracts: ContractData[]
): WeekSchedule {
  const blocks = buildEmptyWeek(weekStart)
  const tasks = collectTasks(clients, contracts, weekStart)

  const workSlotIndices: number[] = []
  blocks.forEach((b, i) => {
    if (b.blockType === 'work') workSlotIndices.push(i)
  })

  let slotPtr = 0
  for (const task of tasks) {
    if (slotPtr >= workSlotIndices.length) break
    const idx = workSlotIndices[slotPtr]
    blocks[idx] = {
      ...blocks[idx],
      clientId: task.clientId,
      clientName: task.clientName,
      businessName: task.businessName,
      serviceTier: task.serviceTier,
      label: task.label,
      deadlineDate: task.deadlineDate,
    }
    slotPtr++
  }

  return {
    weekStart,
    blocks,
    generatedAt: new Date().toISOString(),
  }
}

export function countScheduledClients(schedule: WeekSchedule): number {
  const ids = new Set(
    schedule.blocks.filter((b) => b.blockType === 'work' && b.clientId).map((b) => b.clientId)
  )
  return ids.size
}

export function tierCounts(schedule: WeekSchedule): Record<ServiceTier, number> {
  const counts: Record<ServiceTier, number> = {
    'Premium Custom': 0,
    Business: 0,
    Starter: 0,
  }
  for (const b of schedule.blocks) {
    if (b.blockType === 'work' && b.serviceTier) counts[b.serviceTier]++
  }
  return counts
}
