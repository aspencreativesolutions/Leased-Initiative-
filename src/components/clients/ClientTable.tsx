import { useState, type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UserMinus, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ClientStatusIcon } from './ClientStatusIcon'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { RemoveClientModal } from './RemoveClientModal'
import { TenantMarkerBadge } from './TenantMarkerBadge'
import { clientNameMarkersClass } from './clientBadgeStyles'
import { useApp } from '@/context/AppContext'
import {
  getDisplayContractStatus,
  getFirstName,
  getLeaseStatusLabel,
  getTenantAddress,
} from '@/lib/clientUtils'
import {
  loadTenantTableColumnOrder,
  moveTenantTableColumn,
  saveTenantTableColumnOrder,
  TENANT_TABLE_COLUMN_LABELS,
  TENANT_TABLE_COLUMN_WIDTHS,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import { cn } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import { matchesDashboardFilter, type DashboardFilter } from '@/lib/dashboardFilters'
import type { Client, ContractData } from '@/types'

interface ClientTableProps {
  clients: Client[]
  highlightFilter?: DashboardFilter | null
  /** When true, column headers can be dragged to rearrange the layout. */
  arrangeColumns?: boolean
  columnOrder?: TenantTableColumnId[]
  onColumnOrderChange?: (order: TenantTableColumnId[]) => void
}

function headerVisibilityClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'propertyType':
    case 'email':
      return 'hidden md:table-cell'
    case 'contractStatus':
      return 'hidden sm:table-cell'
    default:
      return ''
  }
}

function headerAlignClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'leaseStatus':
    case 'contractStatus':
    case 'paymentStatus':
      return 'text-center'
    case 'actions':
      return 'text-right'
    default:
      return 'text-left'
  }
}

function renderHeaderLabel(columnId: TenantTableColumnId): ReactNode {
  if (columnId === 'actions') {
    return <span className="sr-only">{TENANT_TABLE_COLUMN_LABELS.actions}</span>
  }
  return TENANT_TABLE_COLUMN_LABELS[columnId]
}

function renderCell(
  columnId: TenantTableColumnId,
  client: Client,
  contract: ContractData | undefined,
  onRemove: () => void
): ReactNode {
  const address = getTenantAddress(client, contract)
  const leaseStatus = getLeaseStatusLabel(client, contract)

  switch (columnId) {
    case 'tenant':
      return (
        <td key={columnId} className="px-3 py-2.5 align-top sm:px-4">
          <div className="min-w-0">
            <div className={clientNameMarkersClass}>
              <Link
                to={`/studio/clients/${client.id}`}
                className="min-w-0 truncate font-semibold text-ink hover:text-brand hover:underline"
                title={
                  client.isSampleClient
                    ? 'THIS IS A MOCK USER.'
                    : client.name !== getFirstName(client.name)
                      ? client.name
                      : undefined
                }
              >
                {getFirstName(client.name)}
              </Link>
              <TenantMarkerBadge />
              <ClientStatusIcon isOfficialClient={client.isOfficialClient} />
            </div>
            <p className="truncate pl-2 text-xs text-ink-muted">{client.businessName}</p>
            <p className="truncate pl-2 text-xs text-ink-faint md:hidden">{client.email}</p>
          </div>
        </td>
      )
    case 'propertyType':
      return (
        <td
          key={columnId}
          className="hidden px-3 py-2.5 align-middle md:table-cell sm:px-4"
        >
          <span className="text-ink-muted">{client.projectType}</span>
        </td>
      )
    case 'email':
      return (
        <td
          key={columnId}
          className="hidden px-3 py-2.5 align-middle whitespace-normal break-words text-ink-muted md:table-cell sm:px-4"
        >
          <div className="flex min-w-0 items-center">
            <span title={client.email}>{client.email}</span>
          </div>
        </td>
      )
    case 'address':
      return (
        <td key={columnId} className="py-2.5 pl-4 pr-3 align-middle sm:pl-5 sm:pr-4">
          <div className="flex min-w-0 items-center">
            <Link
              to={`/studio/clients/${client.id}`}
              className="line-clamp-2 min-w-0 break-words font-bold leading-snug text-ink hover:text-brand hover:underline"
              title={`View tenant at ${address}`}
            >
              {address}
            </Link>
          </div>
        </td>
      )
    case 'leaseStatus':
      return (
        <td key={columnId} className="px-3 py-2.5 text-center align-middle sm:px-4">
          <span
            className="inline-block max-w-full truncate text-xs font-medium text-ink"
            title={leaseStatus}
          >
            {leaseStatus}
          </span>
        </td>
      )
    case 'contractStatus':
      return (
        <td
          key={columnId}
          className="hidden px-3 py-2.5 text-center align-middle sm:table-cell sm:px-4"
        >
          <div className="flex items-center justify-center">
            <StatusBadge
              type="contract"
              status={getDisplayContractStatus(client, contract)}
              tabular
            />
          </div>
        </td>
      )
    case 'paymentStatus':
      return (
        <td key={columnId} className="px-3 py-2.5 text-center align-middle sm:px-4">
          <div className="flex items-center justify-center">
            <StatusBadge type="payment" status={client.paymentStatus} tabular />
          </div>
        </td>
      )
    case 'actions':
      return (
        <td key={columnId} className="px-3 py-2.5 align-top sm:px-4">
          <div className="flex flex-col items-end gap-0.5">
            <button
              type="button"
              className={tableRemoveButtonClass}
              onClick={onRemove}
              title={`Remove ${client.name}`}
              aria-label={`Remove ${client.name}`}
            >
              <UserMinus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            </button>
            <Link
              to={`/studio/clients/${client.id}`}
              className={tableViewLinkSubtleClass}
              title={`View ${client.name}`}
            >
              View
              <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </td>
      )
  }
}

export function ClientTable({
  clients,
  highlightFilter = null,
  arrangeColumns = false,
  columnOrder: controlledOrder,
  onColumnOrderChange,
}: ClientTableProps) {
  const { getContractForClient, refresh } = useApp()
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null)
  const [uncontrolledOrder, setUncontrolledOrder] = useState(loadTenantTableColumnOrder)
  const [dragOverId, setDragOverId] = useState<TenantTableColumnId | null>(null)
  const [draggingId, setDraggingId] = useState<TenantTableColumnId | null>(null)

  const columnOrder = controlledOrder ?? uncontrolledOrder

  const setColumnOrder = (next: TenantTableColumnId[]) => {
    saveTenantTableColumnOrder(next)
    if (onColumnOrderChange) onColumnOrderChange(next)
    else setUncontrolledOrder(next)
  }

  if (clients.length === 0) {
    return null
  }

  const handleDragStart = (columnId: TenantTableColumnId) => (event: DragEvent) => {
    if (!arrangeColumns || columnId === 'actions') return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', columnId)
    setDraggingId(columnId)
  }

  const handleDragOver = (columnId: TenantTableColumnId) => (event: DragEvent) => {
    if (!arrangeColumns || columnId === 'actions' || !draggingId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverId !== columnId) setDragOverId(columnId)
  }

  const handleDrop = (columnId: TenantTableColumnId) => (event: DragEvent) => {
    if (!arrangeColumns || columnId === 'actions') return
    event.preventDefault()
    const fromId = (event.dataTransfer.getData('text/plain') || draggingId) as TenantTableColumnId
    if (fromId) setColumnOrder(moveTenantTableColumn(columnOrder, fromId, columnId))
    setDragOverId(null)
    setDraggingId(null)
  }

  const handleDragEnd = () => {
    setDragOverId(null)
    setDraggingId(null)
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
      <div className="md:hidden min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
        {clients.map((client) => {
          const highlighted =
            highlightFilter !== null && matchesDashboardFilter(client, highlightFilter)
          const dimmed = highlightFilter !== null && !highlighted

          return (
            <ClientTableMobileCard
              key={client.id}
              client={client}
              contract={getContractForClient(client.id)}
              highlighted={highlighted}
              dimmed={dimmed}
              onRemove={() => setRemoveTarget(client)}
            />
          )
        })}
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper md:block">
        {arrangeColumns && (
          <p className="border-b border-line bg-surface px-3 py-1.5 text-[11px] text-ink-muted sm:px-4">
            Drag any column header to rearrange the dashboard layout. Actions stay on the right.
          </p>
        )}
        <div className="table-fit-shell">
          <table className="w-full min-w-0 table-fixed text-left text-sm">
            <colgroup>
              {columnOrder.map((columnId) => (
                <col key={columnId} style={{ width: TENANT_TABLE_COLUMN_WIDTHS[columnId] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
                {columnOrder.map((columnId) => {
                  const canDrag = arrangeColumns && columnId !== 'actions'
                  return (
                    <th
                      key={columnId}
                      draggable={canDrag}
                      onDragStart={handleDragStart(columnId)}
                      onDragOver={handleDragOver(columnId)}
                      onDrop={handleDrop(columnId)}
                      onDragEnd={handleDragEnd}
                      onDragLeave={() => {
                        if (dragOverId === columnId) setDragOverId(null)
                      }}
                      className={cn(
                        'label-caps px-3 py-2.5 sm:px-4',
                        columnId === 'address' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
                        headerAlignClass(columnId),
                        headerVisibilityClass(columnId),
                        canDrag && 'cursor-grab select-none active:cursor-grabbing',
                        draggingId === columnId && 'opacity-50',
                        dragOverId === columnId &&
                          draggingId !== columnId &&
                          'bg-brand/15 ring-1 ring-inset ring-brand/40'
                      )}
                      aria-grabbed={draggingId === columnId || undefined}
                    >
                      {renderHeaderLabel(columnId)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((client) => {
                const contract = getContractForClient(client.id)
                const highlighted =
                  highlightFilter !== null && matchesDashboardFilter(client, highlightFilter)
                const dimmed = highlightFilter !== null && !highlighted

                return (
                  <tr
                    key={client.id}
                    className={cn(
                      'transition-[background-color,opacity,box-shadow]',
                      highlighted &&
                        'bg-brand/10 ring-1 ring-inset ring-brand/40 hover:bg-brand/15',
                      dimmed && 'opacity-40 hover:bg-surface/80 hover:opacity-55',
                      !highlightFilter && 'hover:bg-surface'
                    )}
                  >
                    {columnOrder.map((columnId) =>
                      renderCell(columnId, client, contract, () => setRemoveTarget(client))
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RemoveClientModal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        clientId={removeTarget?.id ?? ''}
        clientName={removeTarget?.name ?? ''}
        hasLinkedAccount={Boolean(removeTarget?.accountUserId)}
        onRemoved={async () => {
          setRemoveTarget(null)
          await refresh()
        }}
      />
    </div>
  )
}
