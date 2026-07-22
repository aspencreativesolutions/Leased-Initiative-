import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clientStatusIconClass,
  clientStatusIconWrapperClass,
} from './clientBadgeStyles'

export function PendingClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(clientStatusIconWrapperClass, 'text-ink-muted', className)}
      title="Not yet an active tenant — lease not signed"
    >
      <Clock className={clientStatusIconClass} strokeWidth={2.25} aria-hidden />
      <span className="sr-only">Pending tenant</span>
    </span>
  )
}
