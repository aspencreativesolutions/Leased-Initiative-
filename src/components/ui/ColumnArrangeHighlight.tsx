import {
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react'
import { cn } from '@/lib/utils'

interface ColumnArrangeHighlightProps {
  tableRef: RefObject<HTMLTableElement>
  /** Visible editable column ids in display order (matches header cell indices). */
  columnOrder: readonly string[]
  hoveredColumnId: string | null
  selectedColumnId: string | null
  draggingId: string | null
}

interface OutlineRect {
  top: number
  left: number
  width: number
  height: number
}

function measureColumnRect(
  table: HTMLTableElement,
  columnIndex: number
): OutlineRect | null {
  const rows = table.rows
  if (!rows.length || columnIndex < 0) return null
  const first = rows[0]?.cells[columnIndex]
  const last = rows[rows.length - 1]?.cells[columnIndex]
  if (!first || !last) return null

  const shell = table.closest('.table-fit-shell') as HTMLElement | null
  const origin = shell ?? table
  const originRect = origin.getBoundingClientRect()
  const topRect = first.getBoundingClientRect()
  const bottomRect = last.getBoundingClientRect()

  return {
    top: topRect.top - originRect.top + origin.scrollTop,
    left: topRect.left - originRect.left + origin.scrollLeft,
    width: topRect.width,
    height: bottomRect.bottom - topRect.top,
  }
}

/**
 * Accent rounded outline over a full spreadsheet column while Edit Columns is active.
 * Keeps last geometry mounted so opacity can fade in and out smoothly.
 */
export function ColumnArrangeHighlight({
  tableRef,
  columnOrder,
  hoveredColumnId,
  selectedColumnId,
  draggingId,
}: ColumnArrangeHighlightProps) {
  const [hoverBox, setHoverBox] = useState<OutlineRect | null>(null)
  const [selectedBox, setSelectedBox] = useState<OutlineRect | null>(null)

  const selectedId = draggingId ?? selectedColumnId
  const hoverId =
    hoveredColumnId && hoveredColumnId !== selectedId ? hoveredColumnId : null
  const hoverActive = hoverId != null
  const selectedActive = selectedId != null

  useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return

    const update = () => {
      const selectedIndex =
        selectedId != null ? columnOrder.indexOf(selectedId) : -1
      const hoverIndex = hoverId != null ? columnOrder.indexOf(hoverId) : -1
      if (selectedIndex >= 0) {
        const next = measureColumnRect(table, selectedIndex)
        if (next) setSelectedBox(next)
      }
      if (hoverIndex >= 0) {
        const next = measureColumnRect(table, hoverIndex)
        if (next) setHoverBox(next)
      }
    }

    update()

    const shell = table.closest('.table-fit-shell')
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => update())
        : null
    resizeObserver?.observe(table)
    if (shell) resizeObserver?.observe(shell)

    window.addEventListener('resize', update)
    shell?.addEventListener('scroll', update, { passive: true })

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', update)
      shell?.removeEventListener('scroll', update)
    }
  }, [tableRef, columnOrder, selectedId, hoverId])

  if (!hoverBox && !selectedBox) return null

  return (
    <>
      {hoverBox ? (
        <div
          aria-hidden
          className={cn(
            'column-arrange-outline pointer-events-none absolute z-[1]',
            'rounded-[var(--radius-sm)] border-[1.5px] border-accent/45 bg-accent/[0.04]',
            hoverActive
              ? 'column-arrange-outline--visible'
              : 'column-arrange-outline--hidden'
          )}
          style={{
            top: hoverBox.top,
            left: hoverBox.left,
            width: hoverBox.width,
            height: hoverBox.height,
          }}
        />
      ) : null}
      {selectedBox ? (
        <div
          aria-hidden
          className={cn(
            'column-arrange-outline pointer-events-none absolute z-[1]',
            'rounded-[var(--radius-sm)] border-[1.5px] border-accent/65 bg-accent/[0.07]',
            selectedActive
              ? 'column-arrange-outline--visible'
              : 'column-arrange-outline--hidden',
            draggingId && selectedActive && 'column-arrange-outline--dragging'
          )}
          style={{
            top: selectedBox.top,
            left: selectedBox.left,
            width: selectedBox.width,
            height: selectedBox.height,
          }}
        />
      ) : null}
    </>
  )
}
