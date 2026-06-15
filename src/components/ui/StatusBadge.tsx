import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusBadgeTableClass } from '@/components/ui/statusBadgeStyles'
import type { ContractStatus, PaymentStatus, ProjectStatus } from '@/types'

type BadgeType = 'project' | 'contract' | 'payment'

const projectStyles: Record<ProjectStatus, string> = {
  Inquiry: 'border-line text-ink-muted bg-transparent',
  'In Progress': 'status-solid',
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
  Signed: 'status-solid',
  Completed: 'border-line text-ink-muted bg-transparent',
  Cancelled: 'border-accent bg-accent-light text-accent',
}

const paymentStyles: Record<PaymentStatus, string> = {
  Unpaid: 'border-line text-ink-muted bg-transparent',
  'Pay Link Clicked': 'border-brand bg-brand/10 text-brand',
  'Deposit Paid': 'border-ink-muted text-ink bg-surface',
  Partial: 'border-accent text-accent bg-transparent',
  Paid: 'status-solid',
  Overdue: 'border-accent bg-accent text-white',
}

const paymentLabels: Partial<Record<PaymentStatus, string>> = {
  Paid: 'Fully paid',
}

interface StatusBadgeProps {
  type: BadgeType
  status: ProjectStatus | ContractStatus | PaymentStatus
  /** Override the text shown inside the badge */
  label?: string
  className?: string
  /** Emphasize as the active / current status */
  highlighted?: boolean
  /** Past stage — same filled pill look across all completed stages */
  completed?: boolean
  /** Fixed width for aligned columns in tables */
  tabular?: boolean
}

export function StatusBadge({
  type,
  status,
  label,
  className,
  highlighted,
  completed,
  tabular,
}: StatusBadgeProps) {
  const displayLabel =
    label ??
    (type === 'payment' ? paymentLabels[status as PaymentStatus] : undefined) ??
    status
  const showOverdueIcon = type === 'payment' && status === 'Overdue'
  const styles =
    type === 'project'
      ? projectStyles[status as ProjectStatus]
      : type === 'contract'
        ? contractStyles[status as ContractStatus]
        : paymentStyles[status as PaymentStatus]

  return (
    <span
      className={cn(
        'status-badge rounded-[var(--radius-sm)] border-[length:var(--border-width)] text-[10px] font-bold',
        tabular ? 'py-0 leading-none' : 'px-2 py-0.5',
        tabular ? statusBadgeTableClass(type) : 'inline-flex items-center',
        completed && !highlighted ? 'status-solid' : styles,
        highlighted &&
          'shadow-[0_0_0_2px_var(--accent-light),var(--status-highlight-glow)] ring-2 ring-accent ring-offset-1 ring-offset-transparent',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-0.5',
          tabular && 'min-w-0 max-w-full justify-center truncate'
        )}
        title={String(displayLabel)}
      >
        {showOverdueIcon && (
          <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
        )}
        <span className={tabular ? 'truncate' : undefined}>{displayLabel}</span>
      </span>
    </span>
  )
}
