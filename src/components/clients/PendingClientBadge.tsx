import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clientBadgeClass, clientBadgeIconClass } from './clientBadgeStyles'

export function PendingClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        clientBadgeClass,
        'border-transparent bg-surface text-ink-muted',
        className
      )}
      title="Not yet an official client — contract not confirmed"
    >
      <Clock className={clientBadgeIconClass} strokeWidth={2.5} />
      Pending
    </span>
  )
}
