import { cn } from '@/lib/utils'

/** Animated “Generating Lease Agreement” status for Pending Tenants. */
export function GeneratingLeaseIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'generating-lease inline-flex items-center gap-2.5 text-xs font-semibold text-ink',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Generating lease agreement"
    >
      <span className="generating-lease__ring" aria-hidden>
        <span className="generating-lease__orbit" />
      </span>
      <span>Generating Lease Agreement</span>
    </div>
  )
}
