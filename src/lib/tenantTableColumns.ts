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
  | 'arrangement'
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

/**
 * Data columns that can be rearranged or hidden; Actions stays pinned on the
 * right. Arrangement is toggle-driven (Show Arrangements) and is not part of
 * Edit Columns persistence.
 */
export const REORDERABLE_TENANT_TABLE_COLUMNS: TenantTableColumnId[] = [
  'tenant',
  'contact',
  'address',
  'paymentStatus',
]

export const TENANT_TABLE_COLUMN_WIDTHS: Record<TenantTableColumnId, string> = {
  // Name + contact links underneath.
  tenant: '16%',
  // Living arrangement (Show Arrangements) — Sole / Co-Tenant + room details.
  arrangement: '16%',
  // Lease status badge (Active / Upcoming / Awaiting Deposit).
  contact: '16%',
  // Widest data column — full property address wraps, never ellipsizes.
  address: '32%',
  // Wide enough for expanded hover copy (e.g. "22 days late · Due July 1")
  paymentStatus: '18%',
  actions: '8%',
}

export const TENANT_TABLE_ACTIONS_RESERVED_PERCENT = 8

export const TENANT_TABLE_COLUMN_LABELS: Record<TenantTableColumnId, string> = {
  tenant: 'Tenant',
  arrangement: 'Arrangement',
  contact: 'Lease Status',
  address: 'Address',
  paymentStatus: 'Payment Status',
  actions: 'Actions',
}

const COLUMN_WIDTH_DEFS: Array<{ id: TenantTableColumnId; width: string }> = (
  Object.keys(TENANT_TABLE_COLUMN_WIDTHS) as TenantTableColumnId[]
)
  .filter((id) => id !== 'actions')
  .map((id) => ({
    id,
    width: TENANT_TABLE_COLUMN_WIDTHS[id],
  }))

/**
 * Insert the Arrangement column immediately after Tenant when Show Arrangements
 * is on. Strips any stray arrangement id when the toggle is off. Arrangement is
 * never persisted in Edit Columns layouts.
 */
export function withTenantArrangementColumn(
  order: readonly TenantTableColumnId[],
  showArrangements: boolean
): TenantTableColumnId[] {
  const base = order.filter((id) => id !== 'arrangement')
  if (!showArrangements) return base

  const tenantIndex = base.indexOf('tenant')
  if (tenantIndex !== -1) {
    return [
      ...base.slice(0, tenantIndex + 1),
      'arrangement',
      ...base.slice(tenantIndex + 1),
    ]
  }

  const actionsIndex = base.indexOf('actions')
  if (actionsIndex === -1) return [...base, 'arrangement']
  return [
    ...base.slice(0, actionsIndex),
    'arrangement',
    ...base.slice(actionsIndex),
  ]
}

/** Drop Arrangement before persisting Edit Columns layouts. */
export function withoutTenantArrangementColumn(
  order: readonly TenantTableColumnId[]
): TenantTableColumnId[] {
  return order.filter((id) => id !== 'arrangement')
}

/**
 * Normalize a persisted layout: keep known reorderable ids (unique) in saved
 * relative order. Missing ids stay hidden. Always pin Actions last.
 * Legacy `leaseStatus` column ids are dropped (badge lives in the Contact/
 * Lease Status column). Legacy `email` column ids map to `contact`.
 * Arrangement is never persisted — use `withTenantArrangementColumn` at render.
 */
export function normalizeTenantTableColumns(
  order: unknown
): TenantTableColumnId[] {
  const remapped = Array.isArray(order)
    ? order.map((id) => (id === 'email' ? 'contact' : id))
    : order
  const reorderable = normalizeVisibleSpreadsheetColumns(
    Array.isArray(remapped)
      ? remapped.filter(
          (id) =>
            id !== 'actions' && id !== 'leaseStatus' && id !== 'arrangement'
        )
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
    withoutTenantArrangementColumn(order).filter((id) => id !== 'actions'),
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
  if (
    fromId === 'actions' ||
    toId === 'actions' ||
    fromId === 'arrangement' ||
    toId === 'arrangement'
  ) {
    return normalizeTenantTableColumns(order)
  }

  const reorderable = withoutTenantArrangementColumn(order).filter(
    (id) => id !== 'actions'
  )
  return normalizeTenantTableColumns(
    moveSpreadsheetColumn(reorderable, fromId, toId)
  )
}

export function nudgeTenantTableColumn(
  order: readonly TenantTableColumnId[],
  columnId: TenantTableColumnId,
  direction: -1 | 1
): TenantTableColumnId[] {
  if (columnId === 'actions' || columnId === 'arrangement') {
    return normalizeTenantTableColumns(order)
  }
  const reorderable = withoutTenantArrangementColumn(order).filter(
    (id) => id !== 'actions'
  )
  return normalizeTenantTableColumns(
    nudgeSpreadsheetColumn(reorderable, columnId, direction)
  )
}

export function hideTenantTableColumn(
  order: TenantTableColumnId[],
  columnId: TenantTableColumnId
): TenantTableColumnId[] {
  if (columnId === 'actions' || columnId === 'arrangement') {
    return normalizeTenantTableColumns(order)
  }
  const reorderable = withoutTenantArrangementColumn(order).filter(
    (id) => id !== 'actions'
  )
  if (reorderable.length <= 1) return normalizeTenantTableColumns(order)
  return normalizeTenantTableColumns(hideSpreadsheetColumn(reorderable, columnId))
}

export function restoreTenantTableColumn(
  order: TenantTableColumnId[],
  columnId: TenantTableColumnId
): TenantTableColumnId[] {
  if (columnId === 'actions' || columnId === 'arrangement') {
    return normalizeTenantTableColumns(order)
  }
  const reorderable = withoutTenantArrangementColumn(order).filter(
    (id) => id !== 'actions'
  )
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
    withoutTenantArrangementColumn(order).filter((id) => id !== 'actions'),
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
    COLUMN_WIDTH_DEFS,
    visibleReorderable,
    TENANT_TABLE_ACTIONS_RESERVED_PERCENT
  )
  return {
    ...Object.fromEntries(
      (Object.keys(TENANT_TABLE_COLUMN_WIDTHS) as TenantTableColumnId[]).map(
        (id) => [id, TENANT_TABLE_COLUMN_WIDTHS[id]]
      )
    ),
    ...widths,
    actions: TENANT_TABLE_COLUMN_WIDTHS.actions,
  } as Record<TenantTableColumnId, string>
}
