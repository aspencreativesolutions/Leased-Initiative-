import {
  hideSpreadsheetColumn,
  hiddenSpreadsheetColumns,
  moveSpreadsheetColumn,
  nudgeSpreadsheetColumn,
  normalizeVisibleSpreadsheetColumns,
  redistributeColumnWidths,
  restoreSpreadsheetColumn,
  saveVisibleSpreadsheetColumns,
} from '@/lib/spreadsheetColumnVisibility'

export const TENANT_TABLE_COLUMN_ORDER_KEY = 'tenant-dashboard-column-order'

export type TenantTableColumnId =
  | 'tenant'
  | 'contact'
  | 'address'
  | 'paymentStatus'
  | 'actions'

export const DEFAULT_TENANT_TABLE_COLUMNS: TenantTableColumnId[] = [
  'tenant',
  'contact',
  'address',
  'paymentStatus',
  'actions',
]

/** Data columns that can be rearranged or hidden; Actions stays pinned on the right. */
export const REORDERABLE_TENANT_TABLE_COLUMNS: TenantTableColumnId[] = [
  'tenant',
  'contact',
  'address',
  'paymentStatus',
]

export const TENANT_TABLE_COLUMN_WIDTHS: Record<TenantTableColumnId, string> = {
  // Name + contact links underneath.
  tenant: '18%',
  // Lease status badge (Active / Upcoming / Awaiting Deposit).
  contact: '18%',
  // Widest data column — full property address wraps, never ellipsizes.
  address: '36%',
  // Wide enough for expanded hover copy (e.g. "22 days late · Due July 1")
  paymentStatus: '20%',
  actions: '8%',
}

export const TENANT_TABLE_ACTIONS_RESERVED_PERCENT = 8

export const TENANT_TABLE_COLUMN_LABELS: Record<TenantTableColumnId, string> = {
  tenant: 'Tenant',
  contact: 'Lease Status',
  address: 'Address',
  paymentStatus: 'Payment Status',
  actions: 'Actions',
}

const REORDERABLE_WIDTH_DEFS = REORDERABLE_TENANT_TABLE_COLUMNS.map((id) => ({
  id,
  width: TENANT_TABLE_COLUMN_WIDTHS[id],
}))

/**
 * Normalize a persisted layout: keep known reorderable ids (unique) in saved
 * relative order. Missing ids stay hidden. Always pin Actions last.
 * Legacy `leaseStatus` column ids are dropped (badge lives in the Contact/
 * Lease Status column). Legacy `email` column ids map to `contact`.
 */
export function normalizeTenantTableColumns(
  order: unknown
): TenantTableColumnId[] {
  const remapped = Array.isArray(order)
    ? order.map((id) => (id === 'email' ? 'contact' : id))
    : order
  const reorderable = normalizeVisibleSpreadsheetColumns(
    Array.isArray(remapped)
      ? remapped.filter((id) => id !== 'actions' && id !== 'leaseStatus')
      : remapped,
    REORDERABLE_TENANT_TABLE_COLUMNS
  )
  return [...reorderable, 'actions']
}

export function loadTenantTableColumnOrder(): TenantTableColumnId[] {
  try {
    const raw = localStorage.getItem(TENANT_TABLE_COLUMN_ORDER_KEY)
    if (!raw) return [...DEFAULT_TENANT_TABLE_COLUMNS]
    return normalizeTenantTableColumns(JSON.parse(raw))
  } catch {
    return [...DEFAULT_TENANT_TABLE_COLUMNS]
  }
}

export function saveTenantTableColumnOrder(order: TenantTableColumnId[]): void {
  const reorderable = normalizeVisibleSpreadsheetColumns(
    order.filter((id) => id !== 'actions'),
    REORDERABLE_TENANT_TABLE_COLUMNS
  )
  saveVisibleSpreadsheetColumns(
    TENANT_TABLE_COLUMN_ORDER_KEY,
    reorderable,
    REORDERABLE_TENANT_TABLE_COLUMNS
  )
}

/** Clears any saved layout and returns the default column order (all visible). */
export function resetTenantTableColumnOrder(): TenantTableColumnId[] {
  localStorage.removeItem(TENANT_TABLE_COLUMN_ORDER_KEY)
  return [...DEFAULT_TENANT_TABLE_COLUMNS]
}

export function moveTenantTableColumn(
  order: readonly TenantTableColumnId[],
  fromId: TenantTableColumnId,
  toId: TenantTableColumnId
): TenantTableColumnId[] {
  if (fromId === 'actions' || toId === 'actions') {
    return normalizeTenantTableColumns(order)
  }

  const reorderable = order.filter((id) => id !== 'actions')
  return normalizeTenantTableColumns(
    moveSpreadsheetColumn(reorderable, fromId, toId)
  )
}

export function nudgeTenantTableColumn(
  order: readonly TenantTableColumnId[],
  columnId: TenantTableColumnId,
  direction: -1 | 1
): TenantTableColumnId[] {
  if (columnId === 'actions') return normalizeTenantTableColumns(order)
  const reorderable = order.filter((id) => id !== 'actions')
  return normalizeTenantTableColumns(
    nudgeSpreadsheetColumn(reorderable, columnId, direction)
  )
}

export function hideTenantTableColumn(
  order: TenantTableColumnId[],
  columnId: TenantTableColumnId
): TenantTableColumnId[] {
  if (columnId === 'actions') return normalizeTenantTableColumns(order)
  const reorderable = order.filter((id) => id !== 'actions')
  if (reorderable.length <= 1) return normalizeTenantTableColumns(order)
  return normalizeTenantTableColumns(hideSpreadsheetColumn(reorderable, columnId))
}

export function restoreTenantTableColumn(
  order: TenantTableColumnId[],
  columnId: TenantTableColumnId
): TenantTableColumnId[] {
  if (columnId === 'actions') return normalizeTenantTableColumns(order)
  const reorderable = order.filter((id) => id !== 'actions')
  return normalizeTenantTableColumns(
    restoreSpreadsheetColumn(
      reorderable,
      columnId,
      REORDERABLE_TENANT_TABLE_COLUMNS
    )
  )
}

/** Hidden data columns in default order (for the Edit Columns banner). */
export function hiddenTenantTableColumns(
  order: TenantTableColumnId[]
): TenantTableColumnId[] {
  return hiddenSpreadsheetColumns(
    order.filter((id) => id !== 'actions'),
    REORDERABLE_TENANT_TABLE_COLUMNS
  )
}

/** Percentage widths for the currently visible columns (actions reserved). */
export function tenantTableColumnWidths(
  order: TenantTableColumnId[]
): Record<TenantTableColumnId, string> {
  const visibleReorderable = order.filter(
    (id): id is Exclude<TenantTableColumnId, 'actions'> => id !== 'actions'
  )
  const widths = redistributeColumnWidths(
    REORDERABLE_WIDTH_DEFS,
    visibleReorderable,
    TENANT_TABLE_ACTIONS_RESERVED_PERCENT
  )
  return {
    ...Object.fromEntries(
      DEFAULT_TENANT_TABLE_COLUMNS.map((id) => [id, TENANT_TABLE_COLUMN_WIDTHS[id]])
    ),
    ...widths,
    actions: TENANT_TABLE_COLUMN_WIDTHS.actions,
  } as Record<TenantTableColumnId, string>
}
