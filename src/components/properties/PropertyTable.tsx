import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { formatUsd } from '@/lib/rentalRent'
import { cn } from '@/lib/utils'
import type { PropertyHousingType } from '@/types'

export type PropertySortColumn =
  | 'address'
  | 'propertyType'
  | 'bedrooms'
  | 'maxTenants'
  | 'currentTenants'
  | 'openUnits'
  | 'monthlyRent'
  | 'occupancy'
  | 'tenantShare'

export interface PropertyTableRow {
  id: string
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  currentTenants: number
  unitCount: number
  openUnits: number
  monthlyRent: number
  tenantShare: number | null
  unitLabel: string | null
}

interface PropertyTableProps {
  rows: PropertyTableRow[]
  sortColumn: PropertySortColumn
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: PropertySortColumn) => void
  onRowClick?: (row: PropertyTableRow) => void
  /** Briefly emphasize a rental after navigating from Waiting to Connect. */
  highlightedId?: string | null
}

const COLUMNS: {
  id: PropertySortColumn
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}[] = [
  { id: 'address', label: 'Property Address', align: 'left', width: '26%' },
  { id: 'propertyType', label: 'Rental Type', align: 'left', width: '12%' },
  { id: 'monthlyRent', label: 'Monthly Rent', align: 'center', width: '12%' },
  { id: 'occupancy', label: 'Occupancy', align: 'center', width: '11%' },
  { id: 'tenantShare', label: 'Tenant Share', align: 'center', width: '12%', hideBelow: 'sm' },
  { id: 'bedrooms', label: 'Bedrooms', align: 'center', width: '9%', hideBelow: 'md' },
  { id: 'maxTenants', label: 'Max Tenants', align: 'center', width: '9%', hideBelow: 'lg' },
  { id: 'openUnits', label: 'Open Units', align: 'center', width: '9%' },
]

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
export function OpenUnitsIndicator({ count }: { count: number }) {
  if (count <= 0) {
    return (
      <span className="tabular-nums text-ink-faint" aria-label="0 open units">
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

  const unitLabel = count === 1 ? 'open unit' : 'open units'

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

export function PropertyTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  highlightedId = null,
}: PropertyTableProps) {
  if (rows.length === 0) return null

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
      <div className="table-fit-shell">
        <table className="w-full min-w-0 table-fixed text-left text-sm">
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
              {COLUMNS.map((column) => {
                const active = sortColumn === column.id
                return (
                  <th
                    key={column.id}
                    className={cn(
                      'label-caps px-3 py-2.5 sm:px-4',
                      column.id === 'address' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
                      cellAlign(column.align),
                      hideClass(column.hideBelow)
                    )}
                  >
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
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const isHighlighted = highlightedId === row.id
              return (
              <tr
                key={row.id}
                id={`rental-row-${row.id}`}
                data-property-id={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={
                  onRowClick ? `Open rental details for ${row.address}` : undefined
                }
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
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
                    'cursor-pointer transition-[background-color,box-shadow,transform] duration-150 ease-out',
                  onRowClick &&
                    !isHighlighted &&
                    'hover:bg-brand/5 hover:shadow-[inset_3px_0_0_0_var(--brand)] focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
                  !onRowClick && !isHighlighted && 'hover:bg-surface',
                  isHighlighted && 'property-table-row--highlight'
                )}
              >
                <td className="py-2.5 pl-4 pr-3 align-top sm:pl-5 sm:pr-4 sm:py-3">
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
                </td>
                <td className="px-3 py-2.5 align-middle text-ink sm:px-4 sm:py-3">
                  {row.propertyType}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center')
                  )}
                >
                  {formatUsd(row.monthlyRent)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center')
                  )}
                >
                  {row.currentTenants} of {row.maxTenants}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center'),
                    hideClass('sm')
                  )}
                >
                  {row.tenantShare != null
                    ? `${formatUsd(row.tenantShare)}/mo`
                    : '—'}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center'),
                    hideClass('md')
                  )}
                >
                  {row.bedrooms}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center'),
                    hideClass('lg')
                  )}
                >
                  {row.maxTenants}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
                    cellAlign('center')
                  )}
                >
                  <span className="inline-flex w-full items-center justify-center">
                    <OpenUnitsIndicator count={row.openUnits} />
                  </span>
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
