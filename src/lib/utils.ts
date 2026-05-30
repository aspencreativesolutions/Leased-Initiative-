import type { Deadline } from '@/types'

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type DeadlineUrgency = 'overdue' | 'due-soon' | 'upcoming' | 'completed'

export function getDeadlineUrgency(deadline: Deadline): DeadlineUrgency {
  if (deadline.completed) return 'completed'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(deadline.date + 'T12:00:00')
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'due-soon'
  return 'upcoming'
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
