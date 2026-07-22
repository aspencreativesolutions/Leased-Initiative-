import { cn } from '@/lib/utils'

/** Small circle with “T” — marks a row as a tenant in admin lists. */
export function TenantMarkerBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        'border border-ink/25 bg-surface text-[9px] font-bold leading-none tracking-tight text-ink-muted',
        className
      )}
      title="Tenant"
    >
      <span aria-hidden>T</span>
      <span className="sr-only">Tenant</span>
    </span>
  )
}
