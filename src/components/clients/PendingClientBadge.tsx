import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PendingClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border-2 border-dashed border-ink-muted bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-caps text-ink-muted',
        className
      )}
      title="Not yet an official client — contract not confirmed"
    >
      <Clock className="h-3 w-3" strokeWidth={2.5} />
      Pending
    </span>
  )
}
