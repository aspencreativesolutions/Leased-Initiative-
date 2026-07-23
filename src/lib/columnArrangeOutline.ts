import { cn } from '@/lib/utils'

/**
 * Soft fill / drag opacity on cells while Edit Columns is active.
 * The continuous rounded outline is drawn by ColumnArrangeHighlight.
 */
export function columnArrangeOutlineClass(
  columnId: string,
  selectedId: string | null,
  hoveredId: string | null,
  draggingId: string | null
): string {
  const selected = selectedId === columnId
  const hovered = hoveredId === columnId && !selected
  const dragging = draggingId === columnId
  if (!selected && !hovered && !dragging) {
    return 'transition-[background-color,opacity] duration-200 ease-out'
  }

  return cn(
    'transition-[background-color,opacity] duration-200 ease-out',
    (selected || hovered) && 'bg-accent/[0.06]',
    dragging && 'opacity-55'
  )
}
