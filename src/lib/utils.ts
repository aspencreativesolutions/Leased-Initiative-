import type { Deadline } from '@/types'

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const d = dateStr.includes('T')
    ? new Date(dateStr)
    : new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(dateStr?: string): string {
  const d = parseDate(dateStr)
  if (!d) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Date + time — used on project timeline actions */
export function formatDateTime(dateStr?: string): string {
  const d = parseDate(dateStr)
  if (!d) return '—'
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatDate(dateStr)}, ${time}`
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
