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

export const PAYMENTS_VISIBLE_COLUMNS_KEY =
  'payments-spreadsheet-visible-columns'

export type PaymentTableColumnId =
  | 'tenant'
  | 'address'
  | 'status'
  | 'amount'
  | 'method'
  | 'lastPayment'
  | 'nextDue'
  | 'leaseEnds'

export type PaymentSortColumn = PaymentTableColumnId

export interface PaymentTableColumnDef {
  id: PaymentTableColumnId
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

export const PAYMENT_TABLE_COLUMNS: PaymentTableColumnDef[] = [
  { id: 'tenant', label: 'Tenant', align: 'left', width: '16%' },
  { id: 'address', label: 'Property Address', align: 'left', width: '20%' },
  { id: 'status', label: 'Status', align: 'center', width: '12%' },
  { id: 'amount', label: 'Amount', align: 'right', width: '12%' },
  {
    id: 'method',
    label: 'Method',
    align: 'center',
    width: '10%',
    hideBelow: 'md',
  },
  {
    id: 'lastPayment',
    label: 'Last Payment',
    align: 'center',
    width: '12%',
    hideBelow: 'lg',
  },
  {
    id: 'nextDue',
    label: 'Next Due',
    align: 'center',
    width: '12%',
    hideBelow: 'sm',
  },
  {
    id: 'leaseEnds',
    label: 'Lease Ends',
    align: 'center',
    width: '12%',
    hideBelow: 'lg',
  },
]

export const DEFAULT_PAYMENT_TABLE_COLUMNS: PaymentTableColumnId[] =
  PAYMENT_TABLE_COLUMNS.map((column) => column.id)

export const PAYMENT_TABLE_COLUMN_LABELS: Record<PaymentTableColumnId, string> =
  Object.fromEntries(
    PAYMENT_TABLE_COLUMNS.map((column) => [column.id, column.label])
  ) as Record<PaymentTableColumnId, string>

export function normalizePaymentTableColumns(
  order: unknown
): PaymentTableColumnId[] {
  return normalizeVisibleSpreadsheetColumns(
    order,
    DEFAULT_PAYMENT_TABLE_COLUMNS
  )
}

export function loadPaymentVisibleColumns(): PaymentTableColumnId[] {
  return loadVisibleSpreadsheetColumns(
    PAYMENTS_VISIBLE_COLUMNS_KEY,
    DEFAULT_PAYMENT_TABLE_COLUMNS
  )
}

export function savePaymentVisibleColumns(
  visible: PaymentTableColumnId[]
): void {
  saveVisibleSpreadsheetColumns(
    PAYMENTS_VISIBLE_COLUMNS_KEY,
    normalizePaymentTableColumns(visible),
    DEFAULT_PAYMENT_TABLE_COLUMNS
  )
}

export function resetPaymentTableColumns(): PaymentTableColumnId[] {
  const next = [...DEFAULT_PAYMENT_TABLE_COLUMNS]
  savePaymentVisibleColumns(next)
  return next
}

export function movePaymentTableColumn(
  order: readonly PaymentTableColumnId[],
  fromId: PaymentTableColumnId,
  toId: PaymentTableColumnId
): PaymentTableColumnId[] {
  return normalizePaymentTableColumns(
    moveSpreadsheetColumn(order, fromId, toId)
  )
}

export function nudgePaymentTableColumn(
  order: readonly PaymentTableColumnId[],
  columnId: PaymentTableColumnId,
  direction: -1 | 1
): PaymentTableColumnId[] {
  return normalizePaymentTableColumns(
    nudgeSpreadsheetColumn(order, columnId, direction)
  )
}

export function hidePaymentTableColumn(
  order: readonly PaymentTableColumnId[],
  columnId: PaymentTableColumnId
): PaymentTableColumnId[] {
  if (order.length <= 1) return normalizePaymentTableColumns(order)
  return normalizePaymentTableColumns(hideSpreadsheetColumn(order, columnId))
}

export function restorePaymentTableColumn(
  order: readonly PaymentTableColumnId[],
  columnId: PaymentTableColumnId
): PaymentTableColumnId[] {
  return normalizePaymentTableColumns(
    restoreSpreadsheetColumn(order, columnId, DEFAULT_PAYMENT_TABLE_COLUMNS)
  )
}

export function hiddenPaymentTableColumns(
  order: readonly PaymentTableColumnId[]
): PaymentTableColumnId[] {
  return hiddenSpreadsheetColumns(order, DEFAULT_PAYMENT_TABLE_COLUMNS)
}

export function paymentTableColumnWidths(
  order: readonly PaymentTableColumnId[]
): Record<PaymentTableColumnId, string> {
  return redistributeColumnWidths(PAYMENT_TABLE_COLUMNS, order, 0)
}
