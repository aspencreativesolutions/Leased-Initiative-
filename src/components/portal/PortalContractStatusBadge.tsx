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
  prominent?: boolean
}

export function PortalContractStatusBadge({
  status,
  className,
  prominent = false,
}: PortalContractStatusBadgeProps) {
  return (
    <span
      className={cn(
        'portal-status-badge inline-flex items-center rounded-[var(--radius-sm)] border-2 uppercase tracking-caps',
        prominent
          ? 'px-3.5 py-1.5 text-xs font-extrabold shadow-sm'
          : 'px-2 py-0.5 text-[10px] font-bold',
        styles[status],
        className
      )}
    >
      {status}
    </span>
  )
}
