import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfficialClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border-2 border-accent bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-caps text-white',
        className
      )}
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
      Client
    </span>
  )
}
