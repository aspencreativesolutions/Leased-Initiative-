import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyHousingType } from '@/types'

export type PropertySortColumn =
  | 'address'
  | 'propertyType'
  | 'bedrooms'
  | 'maxTenants'
  | 'currentTenants'
  | 'openUnits'

export interface PropertyTableRow {
  id: string
  address: string
  propertyType: PropertyHousingType
  bedrooms: number
  maxTenants: number
  currentTenants: number
  openUnits: number
}

interface PropertyTableProps {
  rows: PropertyTableRow[]
  sortColumn: PropertySortColumn
  sortDirection: 'asc' | 'desc'
  onSortChange: (column: PropertySortColumn) => void
  onRowClick?: (row: PropertyTableRow) => void
}

const COLUMNS: {
  id: PropertySortColumn
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}[] = [
  { id: 'address', label: 'Property Address', align: 'left', width: '34%' },
  { id: 'propertyType', label: 'Rental Type', align: 'left', width: '16%' },
  { id: 'bedrooms', label: 'Bedrooms', align: 'center', width: '12%', hideBelow: 'sm' },
  { id: 'maxTenants', label: 'Max Tenants', align: 'center', width: '12%', hideBelow: 'md' },
  { id: 'currentTenants', label: 'Current Tenants', align: 'center', width: '13%' },
  { id: 'openUnits', label: 'Open Units', align: 'center', width: '13%' },
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

export function PropertyTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
}: PropertyTableProps) {
  if (rows.length === 0) return null

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
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.align === 'left' && 'text-left',
                      hideClass(column.hideBelow)
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSortChange(column.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] transition-colors',
                        'hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end',
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
            {rows.map((row) => (
              <tr
                key={row.id}
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
                  onRowClick &&
                    'cursor-pointer transition-[background-color,box-shadow,transform] duration-150 ease-out',
                  onRowClick &&
                    'hover:bg-brand/5 hover:shadow-[inset_3px_0_0_0_var(--brand)] focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
                  !onRowClick && 'hover:bg-surface'
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
                </td>
                <td className="px-3 py-2.5 align-middle text-ink sm:px-4 sm:py-3">
                  {row.propertyType}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle text-center tabular-nums text-ink sm:px-4 sm:py-3',
                    hideClass('sm')
                  )}
                >
                  {row.bedrooms}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle text-center tabular-nums text-ink sm:px-4 sm:py-3',
                    hideClass('md')
                  )}
                >
                  {row.maxTenants}
                </td>
                <td className="px-3 py-2.5 align-middle text-center tabular-nums text-ink sm:px-4 sm:py-3">
                  {row.currentTenants}
                </td>
                <td className="px-3 py-2.5 align-middle text-center tabular-nums text-ink sm:px-4 sm:py-3">
                  {row.openUnits}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
