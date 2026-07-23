import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

function findReorderTarget<T extends string>(
  table: HTMLTableElement,
  order: readonly T[],
  clientX: number,
  isPinned: (id: T) => boolean
): T | null {
  const headers = Array.from(
    table.querySelectorAll<HTMLTableCellElement>('thead th')
  )
  for (let index = 0; index < headers.length; index += 1) {
    const columnId = order[index]
    if (!columnId || isPinned(columnId)) continue
    const rect = headers[index].getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right) return columnId
  }
  return null
}

function columnIdFromEvent<T extends string>(
  table: HTMLTableElement,
  order: readonly T[],
  event: { target: EventTarget | null },
  isPinned: (id: T) => boolean
): T | null {
  const target = event.target
  if (!(target instanceof Element)) return null
  if (target.closest('[data-edit-columns-remove]')) return null
  const cell = target.closest('th, td')
  if (!(cell instanceof HTMLTableCellElement) || !table.contains(cell)) {
    return null
  }
  const columnId = order[cell.cellIndex]
  if (!columnId || isPinned(columnId)) return null
  return columnId
}

interface UseArrangeTableColumnsOptions<T extends string> {
  arrangeColumns: boolean
  columnOrder: readonly T[]
  onColumnOrderChange: (next: T[]) => void
  moveColumn: (order: readonly T[], fromId: T, toId: T) => T[]
  /** Columns that cannot be selected, dragged, or removed (e.g. Actions). */
  isPinned?: (id: T) => boolean
}

/**
 * Pointer-driven column select + drag reorder used by Edit Columns mode
 * (Official Tenants, Rentals spreadsheet, Lease Agreements spreadsheet).
 */
export function useArrangeTableColumns<T extends string>({
  arrangeColumns,
  columnOrder,
  onColumnOrderChange,
  moveColumn,
  isPinned = () => false,
}: UseArrangeTableColumnsOptions<T>): {
  tableRef: RefObject<HTMLTableElement>
  selectedColumnId: T | null
  hoveredColumnId: T | null
  draggingId: T | null
  handleTablePointerDown: (event: ReactPointerEvent<HTMLTableElement>) => void
  handleTablePointerMove: (event: ReactPointerEvent<HTMLTableElement>) => void
  handleTablePointerLeave: () => void
  clearArrangeInteraction: () => void
} {
  const [selectedColumnId, setSelectedColumnId] = useState<T | null>(null)
  const [hoveredColumnId, setHoveredColumnId] = useState<T | null>(null)
  const [draggingId, setDraggingId] = useState<T | null>(null)
  const [pointerTracking, setPointerTracking] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null!)
  const columnOrderRef = useRef(columnOrder)
  const moveColumnRef = useRef(moveColumn)
  const isPinnedRef = useRef(isPinned)
  const onColumnOrderChangeRef = useRef(onColumnOrderChange)
  const dragSessionRef = useRef<{
    columnId: T
    startX: number
    startY: number
    moved: boolean
    wasSelected: boolean
  } | null>(null)

  columnOrderRef.current = columnOrder
  moveColumnRef.current = moveColumn
  isPinnedRef.current = isPinned
  onColumnOrderChangeRef.current = onColumnOrderChange

  const clearArrangeInteraction = () => {
    setSelectedColumnId(null)
    setHoveredColumnId(null)
    setDraggingId(null)
    setPointerTracking(false)
    dragSessionRef.current = null
  }

  useEffect(() => {
    if (!arrangeColumns) clearArrangeInteraction()
  }, [arrangeColumns])

  useEffect(() => {
    if (!pointerTracking) return

    const onPointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current
      const table = tableRef.current
      if (!session || !table) return

      if (!session.moved) {
        const distance = Math.hypot(
          event.clientX - session.startX,
          event.clientY - session.startY
        )
        if (distance < 4) return
        session.moved = true
        setDraggingId(session.columnId)
      }

      const targetId = findReorderTarget(
        table,
        columnOrderRef.current,
        event.clientX,
        isPinnedRef.current
      )
      if (!targetId || targetId === session.columnId) return
      const next = moveColumnRef.current(
        columnOrderRef.current,
        session.columnId,
        targetId
      )
      if (next.join() !== columnOrderRef.current.join()) {
        onColumnOrderChangeRef.current(next)
      }
    }

    const endDrag = () => {
      const session = dragSessionRef.current
      dragSessionRef.current = null
      setPointerTracking(false)
      setDraggingId(null)
      if (session && !session.moved && session.wasSelected) {
        setSelectedColumnId(null)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [pointerTracking])

  const handleTablePointerDown = (
    event: ReactPointerEvent<HTMLTableElement>
  ) => {
    if (!arrangeColumns || event.button !== 0) return
    const table = tableRef.current
    if (!table) return
    const columnId = columnIdFromEvent(
      table,
      columnOrderRef.current,
      event,
      isPinnedRef.current
    )
    if (!columnId) return
    event.preventDefault()
    dragSessionRef.current = {
      columnId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      wasSelected: selectedColumnId === columnId,
    }
    setSelectedColumnId(columnId)
    setHoveredColumnId(columnId)
    setPointerTracking(true)
  }

  const handleTablePointerMove = (
    event: ReactPointerEvent<HTMLTableElement>
  ) => {
    if (!arrangeColumns || pointerTracking) return
    const table = tableRef.current
    if (!table) return
    const columnId = columnIdFromEvent(
      table,
      columnOrderRef.current,
      event,
      isPinnedRef.current
    )
    setHoveredColumnId((prev) => (prev === columnId ? prev : columnId))
  }

  const handleTablePointerLeave = () => {
    if (!arrangeColumns || pointerTracking) return
    setHoveredColumnId(null)
  }

  return {
    tableRef,
    selectedColumnId,
    hoveredColumnId,
    draggingId,
    handleTablePointerDown,
    handleTablePointerMove,
    handleTablePointerLeave,
    clearArrangeInteraction,
  }
}
