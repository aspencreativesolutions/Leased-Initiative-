import type { SchedulerNote, WeekSchedule } from '@/types'

const SCHEDULE_PREFIX = 'client-craft-schedule-'
const NOTES_KEY = 'client-craft-scheduler-notes'

export function loadWeekSchedule(weekStart: string): WeekSchedule | null {
  const raw = localStorage.getItem(SCHEDULE_PREFIX + weekStart)
  return raw ? (JSON.parse(raw) as WeekSchedule) : null
}

export function saveWeekSchedule(schedule: WeekSchedule): void {
  localStorage.setItem(SCHEDULE_PREFIX + schedule.weekStart, JSON.stringify(schedule))
}

export function loadSchedulerNotes(): SchedulerNote[] {
  const raw = localStorage.getItem(NOTES_KEY)
  return raw ? (JSON.parse(raw) as SchedulerNote[]) : []
}

export function saveSchedulerNotes(notes: SchedulerNote[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}
