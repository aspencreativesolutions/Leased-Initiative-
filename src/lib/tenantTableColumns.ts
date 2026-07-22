export const TENANT_TABLE_COLUMN_ORDER_KEY = 'tenant-dashboard-column-order'

export type TenantTableColumnId =
  | 'tenant'
  | 'propertyType'
  | 'email'
  | 'address'
  | 'leaseStatus'
  | 'contractStatus'
  | 'paymentStatus'
  | 'actions'

export const DEFAULT_TENANT_TABLE_COLUMNS: TenantTableColumnId[] = [
  'tenant',
  'propertyType',
  'email',
  'address',
  'leaseStatus',
  'contractStatus',
  'paymentStatus',
  'actions',
]

/** Data columns that can be rearranged; Actions stays pinned on the right. */
export const REORDERABLE_TENANT_TABLE_COLUMNS: TenantTableColumnId[] = [
  'tenant',
  'propertyType',
  'email',
  'address',
  'leaseStatus',
  'contractStatus',
  'paymentStatus',
]

const COLUMN_SET = new Set<string>(DEFAULT_TENANT_TABLE_COLUMNS)

export const TENANT_TABLE_COLUMN_WIDTHS: Record<TenantTableColumnId, string> = {
  tenant: '14%',
  propertyType: '10%',
  email: '16%',
  address: '20%',
  leaseStatus: '12%',
  contractStatus: '10%',
  paymentStatus: '10%',
  actions: '8%',
}

export const TENANT_TABLE_COLUMN_LABELS: Record<TenantTableColumnId, string> = {
  tenant: 'Name',
  propertyType: 'Property Type',
  email: 'Email',
  address: 'Address',
  leaseStatus: 'Lease Status',
  contractStatus: 'Lease Progress',
  paymentStatus: 'Payment Status',
  actions: 'Actions',
}

export function normalizeTenantTableColumns(
  order: unknown
): TenantTableColumnId[] {
  if (!Array.isArray(order)) return [...DEFAULT_TENANT_TABLE_COLUMNS]

  const seen = new Set<TenantTableColumnId>()
  const reorderable: TenantTableColumnId[] = []

  for (const id of order) {
    if (typeof id !== 'string' || !COLUMN_SET.has(id)) continue
    const columnId = id as TenantTableColumnId
    if (columnId === 'actions' || seen.has(columnId)) continue
    seen.add(columnId)
    reorderable.push(columnId)
  }

  for (const id of REORDERABLE_TENANT_TABLE_COLUMNS) {
    if (!seen.has(id)) reorderable.push(id)
  }

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
  localStorage.setItem(
    TENANT_TABLE_COLUMN_ORDER_KEY,
    JSON.stringify(normalizeTenantTableColumns(order))
  )
}

export function moveTenantTableColumn(
  order: TenantTableColumnId[],
  fromId: TenantTableColumnId,
  toId: TenantTableColumnId
): TenantTableColumnId[] {
  if (fromId === toId || fromId === 'actions' || toId === 'actions') {
    return normalizeTenantTableColumns(order)
  }

  const next = order.filter((id) => id !== 'actions' && id !== fromId)
  const toIndex = next.indexOf(toId)
  if (toIndex === -1) return normalizeTenantTableColumns(order)
  next.splice(toIndex, 0, fromId)
  return normalizeTenantTableColumns(next)
}
