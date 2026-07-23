import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import { cn } from '@/lib/utils'
import type { ContractStatus } from '@/types'
import type { LeaseTermProgress } from '@/lib/clientUtils'

export type ContractSortColumn =
  | 'tenant'
  | 'address'
  | 'status'
  | 'duration'
  | 'progress'

export interface ContractTableRow {
  id: string
  clientId: string
  tenantName: string
  address: string
  status: ContractStatus | null
  /** Sent / Signed / Active (and other workflow labels) shown on the badge */
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
}

const COLUMNS: {
  id: ContractSortColumn
  label: string
  align: 'left' | 'center' | 'right'
  width: string
  hideBelow?: 'sm' | 'md' | 'lg'
}[] = [
  { id: 'tenant', label: 'Tenant', align: 'left', width: '18%' },
  { id: 'address', label: 'Property Address', align: 'left', width: '26%' },
  { id: 'status', label: 'Status', align: 'center', width: '12%' },
  { id: 'duration', label: 'Duration', align: 'left', width: '24%', hideBelow: 'sm' },
  { id: 'progress', label: 'Progress', align: 'center', width: '12%' },
]

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

/** Spreadsheet layout for Lease Agreements — mirrors Rentals table chrome. */
export function ContractTable({
  rows,
  sortColumn,
  sortDirection,
  onSortChange,
  onDelete,
  leftAlign = false,
}: ContractTableProps) {
  if (rows.length === 0) return null

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
      <div className="table-fit-shell">
        <table className="w-full min-w-0 table-fixed text-left text-sm">
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
            <col style={{ width: '8%' }} />
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
                      column.id === 'tenant' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
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
              <th className="label-caps px-3 py-2.5 text-right sm:px-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="scroll-mt-28 transition-[background-color,box-shadow] duration-150 ease-out hover:bg-brand/5 hover:shadow-[inset_3px_0_0_0_var(--brand)]"
              >
                <td className="py-2.5 pl-4 pr-3 align-middle sm:pl-5 sm:pr-4 sm:py-3">
                  <p className="font-semibold leading-snug text-ink">{row.tenantName}</p>
                </td>
                <td className="px-3 py-2.5 align-middle sm:px-4 sm:py-3">
                  <p
                    className={cn(
                      'whitespace-normal leading-snug text-ink',
                      'break-normal hyphens-none [overflow-wrap:normal] [word-break:normal]'
                    )}
                  >
                    {row.address}
                  </p>
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
                    cellAlign('center')
                  )}
                >
                  {row.status ? (
                    <StatusBadge
                      type="contract"
                      status={row.status}
                      label={row.statusLabel ?? undefined}
                      hoverDetail={row.statusHoverDetail}
                    />
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle sm:px-4 sm:py-3',
                    cellAlign('left'),
                    hideClass('sm')
                  )}
                >
                  <DurationCell
                    startDate={row.startDate}
                    endDate={row.endDate}
                    durationMonths={row.durationMonths}
                  />
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 align-middle tabular-nums text-ink sm:px-4 sm:py-3',
                    cellAlign('center')
                  )}
                >
                  {row.progress.percentComplete != null
                    ? `${row.progress.percentComplete}%`
                    : '—'}
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
