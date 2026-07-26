import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react'
import { RentalInterestCue } from '@/components/properties/RentalInterestCue'
import { ColumnArrangeHighlight } from '@/components/ui/ColumnArrangeHighlight'
import { EditColumnsArrangeBanner } from '@/components/ui/EditColumnsArrangeBanner'
import { EditColumnsRemoveButton } from '@/components/ui/EditColumnsRemoveButton'
import { useArrangeTableColumns } from '@/hooks/useArrangeTableColumns'
import { columnArrangeOutlineClass } from '@/lib/columnArrangeOutline'
import type { RentalInterestCounts } from '@/lib/properties'
import { formatUsd } from '@/lib/rentalRent'
import {
  DEFAULT_RENTAL_TABLE_COLUMNS,
  hiddenRentalTableColumns,
  hideRentalTableColumn,
  moveRentalTableColumn,
  RENTAL_TABLE_COLUMN_LABELS,
  RENTAL_TABLE_COLUMNS,
  resetRentalTableColumns,
  restoreRentalTableColumn,
  rentalTableColumnWidths,
  type PropertySortColumn,
  type RentalTableColumnId,
} from '@/lib/rentalTableColumns'
import { cn } from '@/lib/utils'
import type { PropertyHousingType } from '@/types'

export type { PropertySortColumn, RentalTableColumnId }

export interface PropertyTableRow {
  id: string
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  currentTenants: number
  unitCount: number
  /** Available capacity units (open beds, or 0/1 for whole-unit homes). */
  openUnits: number
  totalBeds: number
  occupiedBeds: number
  monthlyRent: number
  tenantShare: number | null
  unitLabel: string | null
  /** False when whole-unit / entire-home occupancy hides bed UI. */
  surfacesBeds: boolean
}

interface PropertyTableProps {
  rows: PropertyTableRow[]
  sortColumn: PropertySortColumn
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: PropertySortColumn) => void
  onRowClick?: (row: PropertyTableRow) => void
  onEditClick?: (row: PropertyTableRow) => void
  /** Briefly emphasize a rental after navigating from Waiting to Connect. */
  highlightedId?: string | null
  /** Waiting / pending applicant counts keyed by property id (View Applicants cue). */
  interestByPropertyId?: Map<string, RentalInterestCounts>
  /** Visible spreadsheet columns in display order. Defaults to full set. */
  visibleColumns?: RentalTableColumnId[]
  onVisibleColumnsChange?: (columns: RentalTableColumnId[]) => void
  /** When true, column headers select and drag whole columns to edit the layout. */
  arrangeColumns?: boolean
  /** Exit Edit Columns mode — shown next to Reset in the edit banner. */
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

/** Color-coded open-unit count: 1 light yellow → 2 yellow → 3 red → 4+ dark red. */
export function OpenUnitsIndicator({
  count,
  surfacesBeds = true,
}: {
  count: number
  surfacesBeds?: boolean
}) {
  if (count <= 0) {
    return (
      <span
        className="tabular-nums text-ink-faint"
        aria-label={surfacesBeds ? '0 open units' : 'Fully occupied'}
      >
        —
      </span>
    )
  }

  const tone =
    count >= 4
      ? 'open-units-circle--dark-red'
      : count === 3
        ? 'open-units-circle--red'
        : count === 2
          ? 'open-units-circle--yellow'
          : 'open-units-circle--light-yellow'

  const unitLabel = !surfacesBeds
    ? 'home available'
    : count === 1
      ? 'open bed'
      : 'open beds'

  return (
    <span
      className={cn('open-units-circle', tone)}
      aria-label={`${count} ${unitLabel}`}
      title={`${count} ${unitLabel}`}
    >
      {count}
    </span>
  )
}

function PropertyCell({
  columnId,
  row,
  cellAlign,
  outlineClass,
  onEditClick,
  interest,
}: {
  columnId: RentalTableColumnId
  row: PropertyTableRow
  cellAlign: (align: 'left' | 'center' | 'right') => string
  outlineClass?: string
  onEditClick?: (row: PropertyTableRow) => void
  interest?: RentalInterestCounts
}) {
  switch (columnId) {
    case 'address':
      return (
        <td
          className={cn(
            'py-2.5 pl-4 pr-3 align-top sm:pl-5 sm:pr-4 sm:py-3',
            outlineClass
          )}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'whitespace-normal font-semibold leading-snug text-ink',
                  'break-normal hyphens-none [overflow-wrap:normal] [word-break:normal]'
                )}
              >
                {row.address}
              </p>
              {row.unitLabel ? (
                <p className="mt-0.5 text-xs text-ink-muted">{row.unitLabel}</p>
              ) : null}
            </div>
            {onEditClick ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface hover:text-brand"
                title={`Edit ${row.address}`}
                aria-label={`Edit ${row.address}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onEditClick(row)
                }}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        </td>
      )
    case 'propertyType':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle text-ink sm:px-4 sm:py-3',
            outlineClass
          )}
        >
          {row.propertyType}
        </td>
      )
    case 'monthlyRent':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            outlineClass
          )}
        >
          {formatUsd(row.monthlyRent)}
        </td>
      )
    case 'occupancy':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            outlineClass
          )}
        >
          <span className="block">
            {row.currentTenants} of {row.maxTenants} people
          </span>
          <span className="mt-0.5 block text-[10px] text-ink-muted">
            Beds: {row.occupiedBeds} of {row.totalBeds} occupied
          </span>
          {interest ? (
            <RentalInterestCue
              propertyId={row.id}
              applicantCount={interest.applicantCount}
              pendingTenantCount={interest.pendingTenantCount}
              compact
            />
          ) : null}
        </td>
      )
    case 'tenantShare':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('sm'),
            outlineClass
          )}
        >
          {!row.surfacesBeds
            ? 'Entire unit'
            : row.tenantShare != null
              ? `${formatUsd(row.tenantShare)}/mo`
              : '—'}
        </td>
      )
    case 'bedrooms':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('md'),
            outlineClass
          )}
        >
          {row.bedrooms}
        </td>
      )
    case 'maxTenants':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
            cellAlign('center'),
            hideClass('lg'),
            outlineClass
          )}
        >
          {row.maxTenants}
        </td>
      )
    case 'openUnits':
      return (
        <td
          className={cn(
            'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
            cellAlign('center'),
            outlineClass
          )}
        >
          <span className="inline-flex w-full flex-col items-center justify-center gap-0.5">
            <OpenUnitsIndicator
              count={row.openUnits}
              surfacesBeds={row.surfacesBeds}
            />
            <span className="text-[10px] tabular-nums text-ink-muted">
              {!row.surfacesBeds
                ? row.openUnits > 0
                  ? 'Home open'
                  : 'Occupied'
                : `${row.openUnits} open`}
            </span>
          </span>
        </td>
      )
  }
}

export function PropertyTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  onEditClick,
  highlightedId = null,
  interestByPropertyId,
  visibleColumns = DEFAULT_RENTAL_TABLE_COLUMNS,
  onVisibleColumnsChange,
  arrangeColumns = false,
  onArrangeDone,
}: PropertyTableProps) {
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
    moveColumn: moveRentalTableColumn,
  })

  if (rows.length === 0) return null

  const columnById = new Map(
    RENTAL_TABLE_COLUMNS.map((column) => [column.id, column])
  )
  const columns = visibleColumns
    .map((id) => columnById.get(id))
    .filter((column): column is NonNullable<typeof column> => Boolean(column))
  const widths = rentalTableColumnWidths(visibleColumns)
  const removedColumns = arrangeColumns
    ? hiddenRentalTableColumns(visibleColumns).map((id) => ({
        id,
        label: RENTAL_TABLE_COLUMN_LABELS[id],
      }))
    : []
  const canRemoveSelected = visibleColumns.length > 1

  const setVisibleColumns = (next: RentalTableColumnId[]) => {
    onVisibleColumnsChange?.(next)
  }

  const handleResetLayout = () => {
    setVisibleColumns(resetRentalTableColumns())
    clearArrangeInteraction()
  }

  const handleHideColumn = (columnId: RentalTableColumnId) => {
    const next = hideRentalTableColumn(visibleColumns, columnId)
    if (next.join() === visibleColumns.join()) return
    setVisibleColumns(next)
    clearArrangeInteraction()
  }

  const handleRestoreColumn = (columnId: string) => {
    const next = restoreRentalTableColumn(
      visibleColumns,
      columnId as RentalTableColumnId
    )
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
              {columns.map((column) => {
                const active = sortColumn === column.id
                const isSelected = arrangeColumns && selectedColumnId === column.id
                const showRemove = isSelected && canRemoveSelected
                return (
                  <th
                    key={column.id}
                    className={cn(
                      'label-caps relative px-3 py-2.5 sm:px-4',
                      column.id === 'address' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
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
          <tbody
            className={cn(
              'divide-y divide-line',
              arrangeColumns && '[&_a]:pointer-events-none [&_button]:pointer-events-none'
            )}
          >
            {rows.map((row) => {
              const isHighlighted = highlightedId === row.id
              return (
                <tr
                  key={row.id}
                  id={`rental-row-${row.id}`}
                  data-property-id={row.id}
                  tabIndex={onRowClick && !arrangeColumns ? 0 : undefined}
                  role={onRowClick && !arrangeColumns ? 'button' : undefined}
                  aria-label={
                    onRowClick && !arrangeColumns
                      ? `Open rental details for ${row.address}`
                      : undefined
                  }
                  onClick={
                    onRowClick && !arrangeColumns
                      ? () => onRowClick(row)
                      : undefined
                  }
                  onKeyDown={
                    onRowClick && !arrangeColumns
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'scroll-mt-28',
                    onRowClick &&
                      !arrangeColumns &&
                      'cursor-pointer transition-[background-color,box-shadow,transform] duration-150 ease-out',
                    onRowClick &&
                      !arrangeColumns &&
                      !isHighlighted &&
                      'hover:bg-brand/5 hover:shadow-[inset_3px_0_0_0_var(--brand)] focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
                    (!onRowClick || arrangeColumns) &&
                      !isHighlighted &&
                      !arrangeColumns &&
                      'hover:bg-surface',
                    isHighlighted && 'property-table-row--highlight'
                  )}
                >
                  {columns.map((column) => (
                    <PropertyCell
                      key={column.id}
                      columnId={column.id}
                      row={row}
                      cellAlign={cellAlign}
                      onEditClick={onEditClick}
                      interest={interestByPropertyId?.get(row.id)}
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
