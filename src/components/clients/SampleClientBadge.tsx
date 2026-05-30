import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SampleClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-dashed border-ink-faint bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted label-caps',
        className
      )}
      title="Sample demo client — safe to edit or remove"
    >
      <FlaskConical className="h-3 w-3 shrink-0 opacity-70" />
      Sample
    </span>
  )
}
