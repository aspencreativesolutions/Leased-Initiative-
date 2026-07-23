import { Check, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface EditColumnsRemovedItem {
  id: string
  label: string
}

interface EditColumnsArrangeBannerProps {
  removedColumns: EditColumnsRemovedItem[]
  onRestore: (columnId: string) => void
  onReset: () => void
  onDone?: () => void
}

/** Toolbar for inline Edit Columns mode — Reset, removed-column tags, Done. */
export function EditColumnsArrangeBanner({
  removedColumns,
  onRestore,
  onReset,
  onDone,
}: EditColumnsArrangeBannerProps) {
  return (
    <div className="border-b border-line bg-surface px-3 py-1.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            title="Restore the default column order and visibility."
            aria-label="Restore the default column order and visibility."
            className="shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          {removedColumns.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">
                Removed Columns:
              </span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {removedColumns.map((column) => (
                  <span
                    key={column.id}
                    className={cn(
                      'inline-flex max-w-full items-center gap-1 rounded-sm border border-ink/15',
                      'bg-surface-paper px-2 py-0.5 text-[11px] font-medium text-ink-muted'
                    )}
                  >
                    <span className="min-w-0 truncate">{column.label}</span>
                    <button
                      type="button"
                      title={`Restore ${column.label}`}
                      aria-label={`Restore ${column.label}`}
                      onClick={() => onRestore(column.id)}
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm',
                        'text-ink-muted transition-colors hover:bg-brand/10 hover:text-brand',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45'
                      )}
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {onDone ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onDone}
            title="Done editing columns"
            aria-label="Done editing columns"
            className="shrink-0 shadow-sm"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </Button>
        ) : null}
      </div>
    </div>
  )
}
