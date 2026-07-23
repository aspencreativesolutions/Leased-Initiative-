import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditColumnsRemoveButtonProps {
  columnLabel: string
  onRemove: () => void
}

/** Trash control shown on a selected column header in Edit Columns mode. */
export function EditColumnsRemoveButton({
  columnLabel,
  onRemove,
}: EditColumnsRemoveButtonProps) {
  return (
    <button
      type="button"
      data-edit-columns-remove
      title="Remove Column"
      aria-label={`Remove ${columnLabel} column`}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.preventDefault()
      }}
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        onRemove()
      }}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm',
        'text-accent transition-colors hover:bg-accent/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
        'pointer-events-auto cursor-pointer'
      )}
    >
      <Trash2 className="h-3 w-3" strokeWidth={2.25} aria-hidden />
    </button>
  )
}
