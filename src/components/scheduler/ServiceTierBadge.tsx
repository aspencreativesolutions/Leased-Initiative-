import { cn } from '@/lib/utils'
import type { ServiceTier } from '@/types'

const styles: Record<ServiceTier, string> = {
  'Premium Custom': 'border-ink bg-ink text-surface-paper',
  Business: 'border-ink-muted text-ink bg-surface',
  Starter: 'border-line text-ink-muted bg-transparent',
}

export function ServiceTierBadge({
  tier,
  className,
  small,
}: {
  tier: ServiceTier
  className?: string
  small?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border-2 uppercase tracking-caps',
        small ? 'px-1.5 py-0.5 text-[9px] font-bold' : 'px-3 py-1 text-xs font-extrabold',
        styles[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
