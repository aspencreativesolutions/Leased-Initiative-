import type { Deadline } from '@/types'

export function formatDeadlineTime(time?: string): string {
  if (!time?.trim()) return ''
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return time.trim()
}

export function getDeadlineTimestamp(deadline: Pick<Deadline, 'date' | 'time'>): number {
  const time = deadline.time?.trim() || '12:00'
  const normalized = time.match(/^\d{1,2}:\d{2}$/) ? time : '12:00'
  return new Date(`${deadline.date}T${normalized}`).getTime()
}

export function daysUntilDeadline(deadline: Pick<Deadline, 'date' | 'time'>): number {
  const now = Date.now()
  const due = getDeadlineTimestamp(deadline)
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24))
}

export function formatProximityLabel(deadline: Pick<Deadline, 'date' | 'time'>): string {
  const days = daysUntilDeadline(deadline)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `In ${days} days`
  return ''
}

const DEFAULT_DESCRIPTIONS: Record<Deadline['type'], string> = {
  'follow-up':
    'Use this time to align on goals, timeline, and budget. Come prepared with your brand references, inspiration sites, and a short list of must-haves so the conversation stays focused.',
  project:
    'Review the agreed deliverables for this milestone. Gather any feedback, assets, or approvals needed so work can move forward without delays.',
  contract:
    'Review the lease terms, payment schedule, and revision limits. Prepare any questions before signing so both sides can finalize the agreement confidently.',
  payment:
    'Complete the scheduled payment by the due date. Confirm the invoice amount and payment method ahead of time to avoid processing delays.',
}

export function getDeadlineDescription(deadline: Deadline): string {
  if (deadline.description?.trim()) return deadline.description.trim()
  const label = deadline.label.toLowerCase()
  if (deadline.type === 'follow-up' && label.includes('discovery')) {
    return 'Discovery call to understand your brand, audience, and project goals. Please prepare your inspiration references, competitor examples, and any existing brand assets you want to share.'
  }
  return DEFAULT_DESCRIPTIONS[deadline.type]
}

export function isMeetingDeadline(deadline: Deadline): boolean {
  if (deadline.type === 'follow-up') return true
  return deadline.label.toLowerCase().includes('discovery') || deadline.label.toLowerCase().includes('call')
}
