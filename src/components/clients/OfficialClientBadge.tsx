import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clientBadgeClass, clientBadgeIconClass } from './clientBadgeStyles'

export function OfficialClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        clientBadgeClass,
        'border-accent bg-accent text-white',
        className
      )}
    >
      <BadgeCheck className={clientBadgeIconClass} strokeWidth={2.5} />
      Client
    </span>
  )
}
