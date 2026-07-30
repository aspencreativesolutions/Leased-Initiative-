import { ArrowDown, ArrowUp } from 'lucide-react'
import type { MouseEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface EditColumnsReorderButtonsProps {
  columnLabel: string
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}

/** Up/down controls on each Edit Columns header — same arrow icons as lease sort. */
export function EditColumnsReorderButtons({
  columnLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: EditColumnsReorderButtonsProps) {
  const stopPointer = (event: PointerEvent | MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }

  return (
    <span
      data-edit-columns-reorder
      className="inline-flex shrink-0 flex-col items-center -space-y-0.5"
    >
      <button
        type="button"
        title={`Move ${columnLabel} left`}
        aria-label={`Move ${columnLabel} column left`}
        disabled={!canMoveUp}
        onPointerDown={stopPointer}
        onClick={(event) => {
          stopPointer(event)
          if (canMoveUp) onMoveUp()
        }}
        className={cn(
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm',
          'text-ink-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
          'pointer-events-auto cursor-pointer',
          canMoveUp
            ? 'hover:bg-brand/10 hover:text-brand'
            : 'cursor-default opacity-30'
        )}
      >
        <ArrowUp className="h-3 w-3" aria-hidden />
      </button>
      <button
        type="button"
        title={`Move ${columnLabel} right`}
        aria-label={`Move ${columnLabel} column right`}
        disabled={!canMoveDown}
        onPointerDown={stopPointer}
        onClick={(event) => {
          stopPointer(event)
          if (canMoveDown) onMoveDown()
        }}
        className={cn(
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm',
          'text-ink-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
          'pointer-events-auto cursor-pointer',
          canMoveDown
            ? 'hover:bg-brand/10 hover:text-brand'
            : 'cursor-default opacity-30'
        )}
      >
        <ArrowDown className="h-3 w-3" aria-hidden />
      </button>
    </span>
  )
}
