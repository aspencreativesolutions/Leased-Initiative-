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

export const RENTALS_VISIBLE_COLUMNS_KEY = 'rentals-spreadsheet-visible-columns'

/**
 * Sortable data columns in the Rentals spreadsheet.
 * `currentTenants` is a sort alias for occupancy, not a visible column.
 */
export type RentalTableColumnId =
  | 'address'
  | 'propertyType'
  | 'bedrooms'
  | 'maxTenants'
  | 'openUnits'
  | 'monthlyRent'
  | 'occupancy'
  | 'tenantShare'

export type PropertySortColumn = RentalTableColumnId | 'currentTenants'

export interface RentalTableColumnDef {
  id: RentalTableColumnId
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

export const RENTAL_TABLE_COLUMNS: RentalTableColumnDef[] = [
  { id: 'address', label: 'Property Address', align: 'left', width: '26%' },
  { id: 'propertyType', label: 'Rental Type', align: 'left', width: '12%' },
  { id: 'monthlyRent', label: 'Monthly Rent', align: 'center', width: '12%' },
  { id: 'occupancy', label: 'Occupancy', align: 'center', width: '11%' },
  {
    id: 'tenantShare',
    label: 'Tenant Share',
    align: 'center',
    width: '12%',
    hideBelow: 'sm',
  },
  {
    id: 'bedrooms',
    label: 'Bedrooms',
    align: 'center',
    width: '9%',
    hideBelow: 'md',
  },
  {
    id: 'maxTenants',
    label: 'Max Occupancy',
    align: 'center',
    width: '9%',
    hideBelow: 'lg',
  },
  { id: 'openUnits', label: 'Open Beds', align: 'center', width: '9%' },
]

export const DEFAULT_RENTAL_TABLE_COLUMNS: RentalTableColumnId[] =
  RENTAL_TABLE_COLUMNS.map((column) => column.id)

export const RENTAL_TABLE_COLUMN_LABELS: Record<RentalTableColumnId, string> =
  Object.fromEntries(
    RENTAL_TABLE_COLUMNS.map((column) => [column.id, column.label])
  ) as Record<RentalTableColumnId, string>

export function normalizeRentalTableColumns(
  order: unknown
): RentalTableColumnId[] {
  return normalizeVisibleSpreadsheetColumns(order, DEFAULT_RENTAL_TABLE_COLUMNS)
}

export function loadRentalVisibleColumns(): RentalTableColumnId[] {
  return loadVisibleSpreadsheetColumns(
    RENTALS_VISIBLE_COLUMNS_KEY,
    DEFAULT_RENTAL_TABLE_COLUMNS
  )
}

export function saveRentalVisibleColumns(visible: RentalTableColumnId[]): void {
  saveVisibleSpreadsheetColumns(
    RENTALS_VISIBLE_COLUMNS_KEY,
    visible,
    DEFAULT_RENTAL_TABLE_COLUMNS
  )
}

export function resetRentalTableColumns(): RentalTableColumnId[] {
  localStorage.removeItem(RENTALS_VISIBLE_COLUMNS_KEY)
  return [...DEFAULT_RENTAL_TABLE_COLUMNS]
}

export function moveRentalTableColumn(
  order: readonly RentalTableColumnId[],
  fromId: RentalTableColumnId,
  toId: RentalTableColumnId
): RentalTableColumnId[] {
  return normalizeRentalTableColumns(
    moveSpreadsheetColumn(order, fromId, toId)
  )
}

export function nudgeRentalTableColumn(
  order: readonly RentalTableColumnId[],
  columnId: RentalTableColumnId,
  direction: -1 | 1
): RentalTableColumnId[] {
  return normalizeRentalTableColumns(
    nudgeSpreadsheetColumn(order, columnId, direction)
  )
}

export function hideRentalTableColumn(
  order: readonly RentalTableColumnId[],
  columnId: RentalTableColumnId
): RentalTableColumnId[] {
  if (order.length <= 1) return normalizeRentalTableColumns(order)
  return normalizeRentalTableColumns(hideSpreadsheetColumn(order, columnId))
}

export function restoreRentalTableColumn(
  order: readonly RentalTableColumnId[],
  columnId: RentalTableColumnId
): RentalTableColumnId[] {
  return normalizeRentalTableColumns(
    restoreSpreadsheetColumn(order, columnId, DEFAULT_RENTAL_TABLE_COLUMNS)
  )
}

export function hiddenRentalTableColumns(
  order: readonly RentalTableColumnId[]
): RentalTableColumnId[] {
  return hiddenSpreadsheetColumns(order, DEFAULT_RENTAL_TABLE_COLUMNS)
}

export function rentalTableColumnWidths(
  order: readonly RentalTableColumnId[]
): Record<RentalTableColumnId, string> {
  return redistributeColumnWidths(RENTAL_TABLE_COLUMNS, order)
}
