/**
 * Hide / restore spreadsheet columns while preserving the app's default
 * column order as the reference for insertion.
 */

/** Remove a column from the visible list. */
export function hideSpreadsheetColumn<T extends string>(
  visible: readonly T[],
  columnId: T
): T[] {
  return visible.filter((id) => id !== columnId)
}

/**
 * Move `fromId` so it lands on `toId`'s current slot (same relative reorder
 * used by Official Tenants Edit Columns drag).
 */
export function moveSpreadsheetColumn<T extends string>(
  visible: readonly T[],
  fromId: T,
  toId: T
): T[] {
  if (fromId === toId) return [...visible]
  if (!visible.includes(fromId) || !visible.includes(toId)) return [...visible]
  const next = visible.filter((id) => id !== fromId)
  const toIndex = next.indexOf(toId)
  if (toIndex === -1) return [...visible]
  next.splice(toIndex, 0, fromId)
  return next
}

/**
 * Restore a hidden column into the closest valid position according to
 * `defaultOrder`. Prefers inserting after the rightmost still-visible
 * predecessor; otherwise before the leftmost still-visible successor;
 * otherwise appends (only when every other default column is also hidden).
 */
export function restoreSpreadsheetColumn<T extends string>(
  visible: readonly T[],
  columnId: T,
  defaultOrder: readonly T[]
): T[] {
  if (visible.includes(columnId)) return [...visible]
  if (!defaultOrder.includes(columnId)) return [...visible, columnId]

  const defaultIndex = defaultOrder.indexOf(columnId)
  const next = [...visible]

  for (let i = defaultIndex - 1; i >= 0; i -= 1) {
    const predecessor = defaultOrder[i]
    const insertAfter = next.indexOf(predecessor)
    if (insertAfter !== -1) {
      next.splice(insertAfter + 1, 0, columnId)
      return next
    }
  }

  for (let i = defaultIndex + 1; i < defaultOrder.length; i += 1) {
    const successor = defaultOrder[i]
    const insertBefore = next.indexOf(successor)
    if (insertBefore !== -1) {
      next.splice(insertBefore, 0, columnId)
      return next
    }
  }

  next.push(columnId)
  return next
}

/** Columns in `defaultOrder` that are not currently visible, in default order. */
export function hiddenSpreadsheetColumns<T extends string>(
  visible: readonly T[],
  defaultOrder: readonly T[]
): T[] {
  const visibleSet = new Set(visible)
  return defaultOrder.filter((id) => !visibleSet.has(id))
}

/**
 * Normalize a persisted visible list: keep known ids (unique), in the saved
 * relative order, then append any missing default columns that were never
 * stored (so new columns ship visible).
 */
export function normalizeVisibleSpreadsheetColumns<T extends string>(
  visible: unknown,
  defaultOrder: readonly T[]
): T[] {
  const allowed = new Set(defaultOrder)
  if (!Array.isArray(visible)) return [...defaultOrder]

  const seen = new Set<T>()
  const next: T[] = []
  for (const id of visible) {
    if (typeof id !== 'string' || !allowed.has(id as T) || seen.has(id as T)) {
      continue
    }
    seen.add(id as T)
    next.push(id as T)
  }

  // Empty / fully wiped preference → fall back to defaults rather than a blank table.
  if (next.length === 0) return [...defaultOrder]

  return next
}

export function loadVisibleSpreadsheetColumns<T extends string>(
  storageKey: string,
  defaultOrder: readonly T[]
): T[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return [...defaultOrder]
    return normalizeVisibleSpreadsheetColumns(JSON.parse(raw), defaultOrder)
  } catch {
    return [...defaultOrder]
  }
}

export function saveVisibleSpreadsheetColumns<T extends string>(
  storageKey: string,
  visible: readonly T[],
  defaultOrder: readonly T[]
): void {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(normalizeVisibleSpreadsheetColumns(visible, defaultOrder))
    )
  } catch {
    /* ignore quota / private mode */
  }
}

/** Parse a CSS percentage width like "26%" into a number. */
export function parseWidthPercent(width: string): number {
  const value = Number.parseFloat(width)
  return Number.isFinite(value) ? value : 0
}

/**
 * Redistribute default percentage widths across the currently visible columns
 * so the table still fills its container (optionally reserving space for a
 * pinned actions column).
 */
export function redistributeColumnWidths<T extends string>(
  columns: ReadonlyArray<{ id: T; width: string }>,
  visibleIds: readonly T[],
  reservedPercent = 0
): Record<T, string> {
  const available = Math.max(0, 100 - reservedPercent)
  const visible = columns.filter((column) => visibleIds.includes(column.id))
  const total = visible.reduce(
    (sum, column) => sum + parseWidthPercent(column.width),
    0
  )

  const result = {} as Record<T, string>
  if (visible.length === 0 || total <= 0) {
    for (const column of columns) {
      result[column.id] = column.width
    }
    return result
  }

  for (const column of columns) {
    if (!visibleIds.includes(column.id)) {
      result[column.id] = column.width
      continue
    }
    const share = (parseWidthPercent(column.width) / total) * available
    result[column.id] = `${Math.round(share * 1000) / 1000}%`
  }
  return result
}
