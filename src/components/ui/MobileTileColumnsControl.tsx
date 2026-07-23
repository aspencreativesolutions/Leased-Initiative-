import { Columns2, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MobileTileColumns } from '@/lib/mobileTileColumns'

const shellClass =
  'inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

const segmentClass =
  'inline-flex h-7 items-center justify-center gap-1 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors'

interface MobileTileColumnsControlProps {
  value: MobileTileColumns
  onChange: (columns: MobileTileColumns) => void
  className?: string
  /** Accessible name for the control group */
  label?: string
}

/**
 * Mobile-only 1 vs 2 tiles-per-row switch (no size slider).
 */
export function MobileTileColumnsControl({
  value,
  onChange,
  className,
  label = 'Tiles per row',
}: MobileTileColumnsControlProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(shellClass, className)}
    >
      <button
        type="button"
        title="Two tiles per row"
        aria-label="Two tiles per row"
        aria-pressed={value === 2}
        onClick={() => onChange(2)}
        className={cn(
          segmentClass,
          value === 2
            ? 'bg-brand text-surface-paper'
            : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
        )}
      >
        <Columns2 className="h-3.5 w-3.5" aria-hidden />
        <span>2</span>
      </button>
      <button
        type="button"
        title="One tile per row"
        aria-label="One tile per row"
        aria-pressed={value === 1}
        onClick={() => onChange(1)}
        className={cn(
          segmentClass,
          value === 1
            ? 'bg-brand text-surface-paper'
            : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
        )}
      >
        <Square className="h-3.5 w-3.5" aria-hidden />
        <span>1</span>
      </button>
    </div>
  )
}
