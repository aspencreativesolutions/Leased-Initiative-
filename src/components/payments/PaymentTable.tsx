import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import { ColumnArrangeHighlight } from '@/components/ui/ColumnArrangeHighlight'
import { EditColumnsArrangeBanner } from '@/components/ui/EditColumnsArrangeBanner'
import { EditColumnsRemoveButton } from '@/components/ui/EditColumnsRemoveButton'
import { EditColumnsReorderButtons } from '@/components/ui/EditColumnsReorderButtons'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useArrangeTableColumns } from '@/hooks/useArrangeTableColumns'
import { columnArrangeOutlineClass } from '@/lib/columnArrangeOutline'
import { paymentPartnerLogoByProvider } from '@/lib/paymentPartnerLogos'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import {
  displayBadgeLabel,
  displayBadgeStatus,
  formatUsd,
  paymentTenantAnchorId,
  type TenantPaymentRow,
} from '@/lib/paymentTenantRows'
import {
  DEFAULT_PAYMENT_TABLE_COLUMNS,
  PAYMENT_TABLE_COLUMNS,
  PAYMENT_TABLE_COLUMN_LABELS,
  hiddenPaymentTableColumns,
  hidePaymentTableColumn,
  movePaymentTableColumn,
  nudgePaymentTableColumn,
  paymentTableColumnWidths,
  resetPaymentTableColumns,
  restorePaymentTableColumn,
  type PaymentSortColumn,
  type PaymentTableColumnId,
} from '@/lib/paymentTableColumns'
import { cn, formatDate } from '@/lib/utils'
import type { PaymentProvider } from '@/types'

export type { PaymentSortColumn, PaymentTableColumnId }

export type PaymentTableRow = TenantPaymentRow & {
  paymentMethod: PaymentProvider
}

interface PaymentTableProps {
  rows: PaymentTableRow[]
  sortColumn: PaymentSortColumn
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: PaymentSortColumn) => void
  highlightedId?: string | null
  visibleColumns?: PaymentTableColumnId[]
  onVisibleColumnsChange?: (columns: PaymentTableColumnId[]) => void
  arrangeColumns?: boolean
  onArrangeDone?: () => void
}

function hideClass(hideBelow?: 'sm' | 'md' | 'lg'): string {
  switch (hideBelow) {
    case 'sm':
      return 'hidden sm:table-cell'
    case 'md':
      return 'hidden md:table-cell'
    case 'lg':
      return 'hidden lg:table-cell'
    default:
      return ''
  }
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  if (!active) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
  }
  return direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3" aria-hidden />
  )
}

function PaymentCell({
  columnId,
  row,
  cellAlign,
  outlineClass,
}: {
  columnId: PaymentTableColumnId
  row: PaymentTableRow
  cellAlign: (align: 'left' | 'center' | 'right') => string
  outlineClass?: string
}) {
  const shareLabel =
    row.monthlyRent != null ? formatUsd(row.monthlyRent) : null
  const methodLabel = paymentProviderLabel(row.paymentMethod)
  const methodLogo = paymentPartnerLogoByProvider[row.paymentMethod]

  switch (columnId) {
    case 'tenant':
      return (
        <td
          className={cn(
            'py-2.5 pl-4 pr-3 align-middle sm:pl-5 sm:pr-4 sm:py-3',
            outlineClass
          )}
        >
          <Link
            to={`/studio/clients/${row.client.id}`}
            className="font-semibold leading-snug text-ink hover:text-brand hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.client.name}
          </Link>
        </td>
      )
    case 'address':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
            outlineClass
          )}
        >
          <p className="whitespace-normal leading-snug text-ink">{row.address}</p>
          {row.unitLabel ? (
            <p className="mt-0.5 text-xs text-ink-muted">{row.unitLabel}</p>
          ) : null}
        </td>
      )
    case 'status':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
            cellAlign('center'),
            outlineClass
          )}
        >
          <StatusBadge
            type="payment"
            status={displayBadgeStatus(row.display, row.situation)}
            label={displayBadgeLabel(row.display, row.statusLabel)}
          />
        </td>
      )
    case 'amount':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums sm:px-4 sm:py-3',
            cellAlign('right'),
            outlineClass
          )}
        >
          {row.display === 'Overdue' ? (
            <OverdueAmountIndicator
              amount={row.remainingBalance ?? row.overdueAmount}
              overdueCount={row.overduePaymentCount}
              className="justify-end"
            />
          ) : shareLabel ? (
            <span className="text-ink">{shareLabel}</span>
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </td>
      )
    case 'method':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('md'),
            outlineClass
          )}
        >
          <span className="inline-flex items-center justify-center gap-1.5" title={methodLabel}>
            <img
              src={methodLogo.src}
              alt={methodLogo.alt}
              className="h-5 w-auto max-w-[3.5rem] object-contain"
              loading="lazy"
            />
          </span>
        </td>
      )
    case 'lastPayment':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('lg'),
            outlineClass
          )}
        >
          {row.lastPaymentMadeOn ? formatDate(row.lastPaymentMadeOn) : '—'}
        </td>
      )
    case 'nextDue':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('sm'),
            outlineClass
          )}
        >
          {row.situation === 'paid_in_full'
            ? 'Complete'
            : row.nextDueDate
              ? formatDate(row.nextDueDate)
              : '—'}
        </td>
      )
    case 'leaseEnds':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('lg'),
            outlineClass
          )}
        >
          {row.leaseEndDate ? formatDate(row.leaseEndDate) : '—'}
        </td>
      )
  }
}

/** Spreadsheet layout for Payments — mirrors Rentals / Lease Agreements chrome. */
export function PaymentTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  highlightedId = null,
  visibleColumns = DEFAULT_PAYMENT_TABLE_COLUMNS,
  onVisibleColumnsChange,
  arrangeColumns = false,
  onArrangeDone,
}: PaymentTableProps) {
  const {
    tableRef,
    selectedColumnId,
    hoveredColumnId,
    draggingId,
    handleTablePointerDown,
    handleTablePointerMove,
    handleTablePointerLeave,
    clearArrangeInteraction,
  } = useArrangeTableColumns({
    arrangeColumns,
    columnOrder: visibleColumns,
    onColumnOrderChange: (next) => onVisibleColumnsChange?.(next),
    moveColumn: movePaymentTableColumn,
  })

  if (rows.length === 0) return null

  const columnById = new Map(
    PAYMENT_TABLE_COLUMNS.map((column) => [column.id, column])
  )
  const columns = visibleColumns
    .map((id) => columnById.get(id))
    .filter((column): column is NonNullable<typeof column> => Boolean(column))
  const widths = paymentTableColumnWidths(visibleColumns)
  const removedColumns = arrangeColumns
    ? hiddenPaymentTableColumns(visibleColumns).map((id) => ({
        id,
        label: PAYMENT_TABLE_COLUMN_LABELS[id],
      }))
    : []
  const canRemoveSelected = visibleColumns.length > 1

  const setVisibleColumns = (next: PaymentTableColumnId[]) => {
    onVisibleColumnsChange?.(next)
  }

  const handleResetLayout = () => {
    setVisibleColumns(resetPaymentTableColumns())
    clearArrangeInteraction()
  }

  const handleHideColumn = (columnId: PaymentTableColumnId) => {
    const next = hidePaymentTableColumn(visibleColumns, columnId)
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
    clearArrangeInteraction()
  }

  const handleRestoreColumn = (columnId: string) => {
    const next = restorePaymentTableColumn(
      visibleColumns,
      columnId as PaymentTableColumnId
    )
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
  }

  const handleNudgeColumn = (
    columnId: PaymentTableColumnId,
    direction: -1 | 1
  ) => {
    const next = nudgePaymentTableColumn(visibleColumns, columnId, direction)
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
  }

  const cellAlign = (columnAlign: 'left' | 'center' | 'right') => {
    if (columnAlign === 'left') return 'text-left'
    if (columnAlign === 'right') return 'text-right'
    return 'text-center'
  }

  const headerJustify = (columnAlign: 'left' | 'center' | 'right') => {
    if (columnAlign === 'left') return ''
    if (columnAlign === 'right') return 'justify-end'
    return 'justify-center'
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
      {arrangeColumns ? (
        <EditColumnsArrangeBanner
          removedColumns={removedColumns}
          onRestore={handleRestoreColumn}
          onReset={handleResetLayout}
          onDone={onArrangeDone}
        />
      ) : null}
      <div className="table-fit-shell">
        {arrangeColumns ? (
          <ColumnArrangeHighlight
            tableRef={tableRef}
            columnOrder={visibleColumns}
            hoveredColumnId={hoveredColumnId}
            selectedColumnId={selectedColumnId}
            draggingId={draggingId}
          />
        ) : null}
        <table
          ref={tableRef}
          onPointerDown={handleTablePointerDown}
          onPointerMove={handleTablePointerMove}
          onPointerLeave={handleTablePointerLeave}
          className={cn(
            'w-full min-w-0 table-fixed text-left text-sm',
            arrangeColumns &&
              'select-none touch-none [&_th]:cursor-grab [&_td]:cursor-grab active:[&_th]:cursor-grabbing active:[&_td]:cursor-grabbing'
          )}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: widths[column.id] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
              {columns.map((column, columnIndex) => {
                const active = sortColumn === column.id
                const isSelected =
                  arrangeColumns && selectedColumnId === column.id
                const showRemove = isSelected && canRemoveSelected
                return (
                  <th
                    key={column.id}
                    className={cn(
                      'label-caps relative px-3 py-2.5 sm:px-4',
                      column.id === 'tenant' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
                      cellAlign(column.align),
                      hideClass(column.hideBelow),
                      arrangeColumns && 'active:cursor-grabbing',
                      columnArrangeOutlineClass(
                        column.id,
                        selectedColumnId,
                        hoveredColumnId,
                        draggingId
                      )
                    )}
                    aria-selected={isSelected ? true : undefined}
                    aria-grabbed={draggingId === column.id || undefined}
                  >
                    <span
                      className={cn(
                        'inline-flex max-w-full items-center gap-1.5',
                        headerJustify(column.align)
                      )}
                    >
                      {arrangeColumns ? (
                        <span>{column.label}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSortChange(column.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] transition-colors',
                            'hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                            headerJustify(column.align),
                            active && 'text-ink'
                          )}
                          aria-label={`Sort by ${column.label}`}
                        >
                          <span>{column.label}</span>
                          <SortIcon active={active} direction={sortDirection} />
                        </button>
                      )}
                      {arrangeColumns ? (
                        <EditColumnsReorderButtons
                          columnLabel={column.label}
                          canMoveUp={columnIndex > 0}
                          canMoveDown={columnIndex < columns.length - 1}
                          onMoveUp={() => handleNudgeColumn(column.id, -1)}
                          onMoveDown={() => handleNudgeColumn(column.id, 1)}
                        />
                      ) : null}
                      {showRemove ? (
                        <EditColumnsRemoveButton
                          columnLabel={column.label}
                          onRemove={() => handleHideColumn(column.id)}
                        />
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const anchorId = paymentTenantAnchorId(row.client.id)
              const highlighted = highlightedId === anchorId
              return (
                <tr
                  key={row.client.id}
                  id={anchorId}
                  className={cn(
                    'border-b border-line last:border-b-0 scroll-mt-28',
                    highlighted && 'bg-brand/5'
                  )}
                >
                  {columns.map((column) => (
                    <PaymentCell
                      key={column.id}
                      columnId={column.id}
                      row={row}
                      cellAlign={cellAlign}
                      outlineClass={columnArrangeOutlineClass(
                        column.id,
                        selectedColumnId,
                        hoveredColumnId,
                        draggingId
                      )}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
