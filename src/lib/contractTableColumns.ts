import {
  hideSpreadsheetColumn,
  hiddenSpreadsheetColumns,
  loadVisibleSpreadsheetColumns,
  moveSpreadsheetColumn,
  nudgeSpreadsheetColumn,
  normalizeVisibleSpreadsheetColumns,
  redistributeColumnWidths,
  restoreSpreadsheetColumn,
  saveVisibleSpreadsheetColumns,
} from '@/lib/spreadsheetColumnVisibility'

export const CONTRACTS_VISIBLE_COLUMNS_KEY =
  'contracts-spreadsheet-visible-columns'

export type ContractTableColumnId =
  | 'tenant'
  | 'address'
  | 'status'
  | 'duration'
  | 'progress'

export type ContractSortColumn = ContractTableColumnId

export interface ContractTableColumnDef {
  id: ContractTableColumnId
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

export const CONTRACT_TABLE_COLUMNS: ContractTableColumnDef[] = [
  { id: 'tenant', label: 'Tenant', align: 'left', width: '18%' },
  { id: 'address', label: 'Property Address', align: 'left', width: '26%' },
  { id: 'status', label: 'Status', align: 'center', width: '12%' },
  {
    id: 'duration',
    label: 'Duration',
    align: 'left',
    width: '24%',
    hideBelow: 'sm',
  },
  { id: 'progress', label: 'Progress', align: 'center', width: '12%' },
]

/** Pinned actions column — not editable via Edit Columns. */
export const CONTRACT_TABLE_ACTIONS_WIDTH = '8%'
export const CONTRACT_TABLE_ACTIONS_RESERVED_PERCENT = 8

export const DEFAULT_CONTRACT_TABLE_COLUMNS: ContractTableColumnId[] =
  CONTRACT_TABLE_COLUMNS.map((column) => column.id)

export const CONTRACT_TABLE_COLUMN_LABELS: Record<
  ContractTableColumnId,
  string
> = Object.fromEntries(
  CONTRACT_TABLE_COLUMNS.map((column) => [column.id, column.label])
) as Record<ContractTableColumnId, string>

export function normalizeContractTableColumns(
  order: unknown
): ContractTableColumnId[] {
  return normalizeVisibleSpreadsheetColumns(
    order,
    DEFAULT_CONTRACT_TABLE_COLUMNS
  )
}

export function loadContractVisibleColumns(): ContractTableColumnId[] {
  return loadVisibleSpreadsheetColumns(
    CONTRACTS_VISIBLE_COLUMNS_KEY,
    DEFAULT_CONTRACT_TABLE_COLUMNS
  )
}

export function saveContractVisibleColumns(
  visible: ContractTableColumnId[]
): void {
  saveVisibleSpreadsheetColumns(
    CONTRACTS_VISIBLE_COLUMNS_KEY,
    visible,
    DEFAULT_CONTRACT_TABLE_COLUMNS
  )
}

export function resetContractTableColumns(): ContractTableColumnId[] {
  localStorage.removeItem(CONTRACTS_VISIBLE_COLUMNS_KEY)
  return [...DEFAULT_CONTRACT_TABLE_COLUMNS]
}

export function moveContractTableColumn(
  order: readonly ContractTableColumnId[],
  fromId: ContractTableColumnId,
  toId: ContractTableColumnId
): ContractTableColumnId[] {
  return normalizeContractTableColumns(
    moveSpreadsheetColumn(order, fromId, toId)
  )
}

export function nudgeContractTableColumn(
  order: readonly ContractTableColumnId[],
  columnId: ContractTableColumnId,
  direction: -1 | 1
): ContractTableColumnId[] {
  return normalizeContractTableColumns(
    nudgeSpreadsheetColumn(order, columnId, direction)
  )
}

export function hideContractTableColumn(
  order: readonly ContractTableColumnId[],
  columnId: ContractTableColumnId
): ContractTableColumnId[] {
  if (order.length <= 1) return normalizeContractTableColumns(order)
  return normalizeContractTableColumns(hideSpreadsheetColumn(order, columnId))
}

export function restoreContractTableColumn(
  order: readonly ContractTableColumnId[],
  columnId: ContractTableColumnId
): ContractTableColumnId[] {
  return normalizeContractTableColumns(
    restoreSpreadsheetColumn(order, columnId, DEFAULT_CONTRACT_TABLE_COLUMNS)
  )
}

export function hiddenContractTableColumns(
  order: readonly ContractTableColumnId[]
): ContractTableColumnId[] {
  return hiddenSpreadsheetColumns(order, DEFAULT_CONTRACT_TABLE_COLUMNS)
}

export function contractTableColumnWidths(
  order: readonly ContractTableColumnId[]
): Record<ContractTableColumnId, string> {
  return redistributeColumnWidths(
    CONTRACT_TABLE_COLUMNS,
    order,
    CONTRACT_TABLE_ACTIONS_RESERVED_PERCENT
  )
}
