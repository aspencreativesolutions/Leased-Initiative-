import { cn } from '@/lib/utils'
import type { PortalContractClientStatus } from '@/types'

const styles: Record<PortalContractClientStatus, string> = {
  'Pending Review': 'border-accent bg-accent-light text-accent',
  Viewed: 'border-ink bg-surface text-ink',
  Accepted: 'border-emerald-600 bg-emerald-50 text-emerald-800',
}

interface PortalContractStatusBadgeProps {
  status: PortalContractClientStatus
  className?: string
}

export function PortalContractStatusBadge({
  status,
  className,
}: PortalContractStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-caps',
        styles[status],
        className
      )}
    >
      {status}
    </span>
  )
}
