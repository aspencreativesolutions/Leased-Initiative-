import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AddressText } from '@/components/ui/AddressText'
import { ColumnArrangeHighlight } from '@/components/ui/ColumnArrangeHighlight'
import { EditColumnsArrangeBanner } from '@/components/ui/EditColumnsArrangeBanner'
import { EditColumnsRemoveButton } from '@/components/ui/EditColumnsRemoveButton'
import { EditColumnsReorderButtons } from '@/components/ui/EditColumnsReorderButtons'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useArrangeTableColumns } from '@/hooks/useArrangeTableColumns'
import { columnArrangeOutlineClass } from '@/lib/columnArrangeOutline'
import {
  CONTRACT_TABLE_ACTIONS_WIDTH,
  CONTRACT_TABLE_COLUMN_LABELS,
  CONTRACT_TABLE_COLUMNS,
  DEFAULT_CONTRACT_TABLE_COLUMNS,
  contractTableColumnWidths,
  hiddenContractTableColumns,
  hideContractTableColumn,
  moveContractTableColumn,
  nudgeContractTableColumn,
  resetContractTableColumns,
  restoreContractTableColumn,
  type ContractSortColumn,
  type ContractTableColumnId,
} from '@/lib/contractTableColumns'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import { cn } from '@/lib/utils'
import type { ContractStatus } from '@/types'
import type { LeaseTermProgress } from '@/lib/clientUtils'

export type { ContractSortColumn, ContractTableColumnId }

export interface ContractTableRow {
  id: string
  clientId: string
  tenantName: string
  address: string
  status: ContractStatus | null
  /** Sent / Signed (and other workflow labels) shown on the badge */
  statusLabel?: string | null
  statusHoverDetail?: string
  startDate?: string
  endDate?: string
  /** Lease length in months — used for Duration display and sorting */
  durationMonths?: number | null
  progress: LeaseTermProgress
}

interface ContractTableProps {
  rows: ContractTableRow[]
  sortColumn: ContractSortColumn
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: ContractSortColumn) => void
  onDelete: (contractId: string) => void
  leftAlign?: boolean
  /** Visible spreadsheet columns in display order. Defaults to full set. */
  visibleColumns?: ContractTableColumnId[]
  onVisibleColumnsChange?: (columns: ContractTableColumnId[]) => void
  /** When true, column headers select and drag whole columns to edit the layout. */
  arrangeColumns?: boolean
  /** Exit Edit Columns mode — shown next to Reset in the edit banner. */
  onArrangeDone?: () => void
}

/** Medium date for Duration cells — e.g. "Jan 1, 2026". */
function formatDurationDate(dateStr?: string): string | null {
  if (!dateStr) return null
  const d = dateStr.includes('T')
    ? new Date(dateStr)
    : new Date(`${dateStr.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DurationCell({
  startDate,
  endDate,
  durationMonths,
}: {
  startDate?: string
  endDate?: string
  durationMonths?: number | null
}) {
  const start = formatDurationDate(startDate)
  const end = formatDurationDate(endDate)
  const lengthLabel =
    durationMonths != null && durationMonths > 0
      ? formatLeaseLengthLabel(durationMonths)
      : null

  if (!start && !end && !lengthLabel) {
    return <span className="text-ink-faint">—</span>
  }

  const dateRange =
    start && end ? `${start} – ${end}` : start ? `${start} – —` : end ? `— – ${end}` : null

  return (
    <div className="min-w-0 leading-snug">
      {dateRange ? (
        <p className="whitespace-normal text-ink tabular-nums">{dateRange}</p>
      ) : null}
      {lengthLabel ? (
        <p
          className={cn(
            'text-xs text-ink-muted',
            dateRange ? 'mt-0.5' : 'text-sm text-ink'
          )}
        >
          ({lengthLabel})
        </p>
      ) : null}
    </div>
  )
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

function ContractCell({
  columnId,
  row,
  cellAlign,
  outlineClass,
}: {
  columnId: ContractTableColumnId
  row: ContractTableRow
  cellAlign: (align: 'left' | 'center' | 'right') => string
  outlineClass?: string
}) {
  switch (columnId) {
    case 'tenant':
      return (
        <td
          className={cn(
            'py-2.5 pl-4 pr-3 align-middle sm:pl-5 sm:pr-4 sm:py-3',
            outlineClass
          )}
        >
          <p className="font-semibold leading-snug text-ink">{row.tenantName}</p>
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
          <p className="min-w-0 leading-snug text-ink">
            <AddressText address={row.address} />
          </p>
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
          {row.status ? (
            <StatusBadge
              type="contract"
              status={
                row.statusLabel === 'Signed' || row.statusLabel === 'Sent'
                  ? row.statusLabel
                  : row.status
              }
              label={row.statusLabel ?? undefined}
              hoverDetail={row.statusHoverDetail}
              tabular
            />
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </td>
      )
    case 'duration':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
            cellAlign('left'),
            hideClass('sm'),
            outlineClass
          )}
        >
          <DurationCell
            startDate={row.startDate}
            endDate={row.endDate}
            durationMonths={row.durationMonths}
          />
        </td>
      )
    case 'progress':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            outlineClass
          )}
        >
          {row.progress.state === 'Upcoming'
            ? 'Not started'
            : row.progress.percentComplete != null
              ? `${row.progress.percentComplete}%`
              : '—'}
        </td>
      )
  }
}

/** Spreadsheet layout for Lease Agreements — mirrors Rentals table chrome. */
export function ContractTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  onDelete,
  leftAlign = false,
  visibleColumns = DEFAULT_CONTRACT_TABLE_COLUMNS,
  onVisibleColumnsChange,
  arrangeColumns = false,
  onArrangeDone,
}: ContractTableProps) {
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
    moveColumn: moveContractTableColumn,
  })

  if (rows.length === 0) return null

  const columnById = new Map(
    CONTRACT_TABLE_COLUMNS.map((column) => [column.id, column])
  )
  const columns = visibleColumns
    .map((id) => columnById.get(id))
    .filter((column): column is NonNullable<typeof column> => Boolean(column))
  const widths = contractTableColumnWidths(visibleColumns)
  const removedColumns = arrangeColumns
    ? hiddenContractTableColumns(visibleColumns).map((id) => ({
        id,
        label: CONTRACT_TABLE_COLUMN_LABELS[id],
      }))
    : []
  const canRemoveSelected = visibleColumns.length > 1

  const setVisibleColumns = (next: ContractTableColumnId[]) => {
    onVisibleColumnsChange?.(next)
  }

  const handleResetLayout = () => {
    setVisibleColumns(resetContractTableColumns())
    clearArrangeInteraction()
  }

  const handleHideColumn = (columnId: ContractTableColumnId) => {
    const next = hideContractTableColumn(visibleColumns, columnId)
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
    clearArrangeInteraction()
  }

  const handleRestoreColumn = (columnId: string) => {
    const next = restoreContractTableColumn(
      visibleColumns,
      columnId as ContractTableColumnId
    )
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
  }

  const handleNudgeColumn = (
    columnId: ContractTableColumnId,
    direction: -1 | 1
  ) => {
    const next = nudgeContractTableColumn(visibleColumns, columnId, direction)
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
  }

  const cellAlign = (columnAlign: 'left' | 'center' | 'right') => {
    if (leftAlign || columnAlign === 'left') return 'text-left'
    if (columnAlign === 'right') return 'text-right'
    return 'text-center'
  }

  const headerJustify = (columnAlign: 'left' | 'center' | 'right') => {
    if (leftAlign || columnAlign === 'left') return ''
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
              'select-none touch-none [&_th]:cursor-grab [&_td]:cursor-grab active:[&_th]:cursor-grabbing active:[&_td]:cursor-grabbing [&_th:last-child]:cursor-default [&_td:last-child]:cursor-default'
          )}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: widths[column.id] }} />
            ))}
            <col style={{ width: CONTRACT_TABLE_ACTIONS_WIDTH }} />
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
              <th className="label-caps px-3 py-2.5 text-right sm:px-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody
            className={cn(
              'divide-y divide-line',
              arrangeColumns && '[&_a]:pointer-events-none [&_button]:pointer-events-none'
            )}
          >
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'scroll-mt-28 transition-[background-color,box-shadow] duration-150 ease-out',
                    !arrangeColumns &&
                      'hover:bg-brand/5 hover:shadow-[inset_3px_0_0_0_var(--brand)]'
                  )}
                >
                  {columns.map((column) => (
                    <ContractCell
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
                  <td className="px-3 py-2.5 align-middle sm:px-4 sm:py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/studio/clients/${row.clientId}/contract`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="!h-8 !px-2 !text-[10px]"
                          title="Open lease"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Open</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!h-8 !px-2 !text-[10px] !text-accent"
                        title="Delete lease"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
