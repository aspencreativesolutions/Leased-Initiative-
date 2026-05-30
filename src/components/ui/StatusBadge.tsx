import { cn } from '@/lib/utils'
import type { ContractStatus, PaymentStatus, ProjectStatus } from '@/types'

type BadgeType = 'project' | 'contract' | 'payment'

const projectStyles: Record<ProjectStatus, string> = {
  Inquiry: 'border-line text-ink-muted bg-transparent',
  'In Progress': 'border-ink bg-ink text-surface-paper',
  'Contract Sent': 'border-accent text-accent bg-transparent',
  'Contract Signed': 'border-ink bg-surface text-ink',
  Completed: 'border-line text-ink-faint bg-transparent',
  'Follow-Up Needed': 'border-accent bg-accent text-white',
}

const contractStyles: Record<ContractStatus, string> = {
  'Not Started': 'border-line text-ink-faint bg-transparent',
  'Draft in Progress': 'border-ink-muted text-ink bg-transparent',
  Generated: 'border-ink text-ink bg-surface',
  Sent: 'border-accent text-accent bg-transparent',
  Signed: 'border-ink bg-ink text-surface-paper',
  Completed: 'border-line text-ink-muted bg-transparent',
  Cancelled: 'border-accent bg-accent-light text-accent',
}

const paymentStyles: Record<PaymentStatus, string> = {
  Unpaid: 'border-line text-ink-muted bg-transparent',
  'Deposit Paid': 'border-ink-muted text-ink bg-surface',
  Partial: 'border-accent text-accent bg-transparent',
  Paid: 'border-ink bg-ink text-surface-paper',
  Overdue: 'border-accent bg-accent text-white',
}

interface StatusBadgeProps {
  type: BadgeType
  status: ProjectStatus | ContractStatus | PaymentStatus
  className?: string
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const styles =
    type === 'project'
      ? projectStyles[status as ProjectStatus]
      : type === 'contract'
        ? contractStyles[status as ContractStatus]
        : paymentStyles[status as PaymentStatus]

  return (
    <span
      className={cn(
        'status-badge inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2 py-0.5 text-[10px] font-bold',
        styles,
        className
      )}
    >
      {status}
    </span>
  )
}
