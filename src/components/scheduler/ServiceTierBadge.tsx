import { isTopServiceTier } from '@/lib/serviceTiers'
import { cn } from '@/lib/utils'
import type { ServiceTier } from '@/types'

const styles: Record<ServiceTier, string> = {
  Summit: 'border-ink bg-ink text-surface-paper',
  Studio: 'border-ink-muted text-ink bg-surface',
  Launch: 'border-line text-ink-muted bg-transparent',
}

export function ServiceTierBadge({
  tier,
  className,
  small,
  tiny,
}: {
  tier: ServiceTier
  className?: string
  small?: boolean
  tiny?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] uppercase tracking-caps',
        tiny
          ? 'px-1 py-0 text-[7px] font-bold leading-tight'
          : small
            ? 'px-1.5 py-0.5 text-[9px] font-bold'
            : 'px-3 py-1 text-xs font-extrabold',
        styles[tier],
        isTopServiceTier(tier) && tiny && 'border-surface-paper/30',
        className
      )}
    >
      {tier}
    </span>
  )
}

export function serviceTierBlockStyle(tier: ServiceTier): string {
  if (isTopServiceTier(tier)) {
    return 'border-ink bg-ink text-surface-paper hover:bg-brand-light'
  }
  if (tier === 'Studio') {
    return 'border-ink-muted bg-surface hover:border-ink'
  }
  return 'border-ink-muted/70 bg-surface-paper hover:border-ink-muted'
}

export function serviceTierOnDarkTextClass(tier: ServiceTier | undefined): string {
  return tier && isTopServiceTier(tier) ? 'text-surface-paper' : 'text-ink'
}

export function serviceTierMutedTextClass(tier: ServiceTier | undefined): string {
  return tier && isTopServiceTier(tier) ? 'text-surface-paper/80' : 'text-ink-muted'
}

export function serviceTierFaintTextClass(tier: ServiceTier | undefined): string {
  return tier && isTopServiceTier(tier) ? 'text-surface-paper/70' : 'text-ink-faint'
}
