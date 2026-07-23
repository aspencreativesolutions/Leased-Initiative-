import { useState, type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronsUpDown, UserMinus, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { RemoveClientModal } from './RemoveClientModal'
import { TenantNameWithLeaseIcons } from './TenantLeaseStatusIcons'
import { useApp } from '@/context/AppContext'
import {
  getLeaseStatusDetails,
} from '@/lib/clientUtils'
import {
  cycleOfficialTenantLocationDisplayMode,
  getOfficialTenantLocationDisplayValue,
  getTenantAssignedProperty,
  loadOfficialTenantLocationDisplayMode,
  OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS,
  saveOfficialTenantLocationDisplayMode,
  type OfficialTenantLocationDisplayMode,
} from '@/lib/officialTenantLocationDisplay'
import {
  loadTenantTableColumnOrder,
  moveTenantTableColumn,
  saveTenantTableColumnOrder,
  TENANT_TABLE_COLUMN_LABELS,
  TENANT_TABLE_COLUMN_WIDTHS,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import { cn, formatDate } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import { matchesDashboardFilter, type DashboardFilter } from '@/lib/dashboardFilters'
import type { Client, ContractData, Property } from '@/types'

interface ClientTableProps {
  clients: Client[]
  highlightFilter?: DashboardFilter | null
  /** When true, column headers can be dragged to rearrange the layout. */
  arrangeColumns?: boolean
  columnOrder?: TenantTableColumnId[]
  onColumnOrderChange?: (order: TenantTableColumnId[]) => void
  locationDisplayMode?: OfficialTenantLocationDisplayMode
  onLocationDisplayModeChange?: (mode: OfficialTenantLocationDisplayMode) => void
}

function headerVisibilityClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'email':
      return 'hidden md:table-cell'
    default:
      return ''
  }
}

function headerAlignClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'leaseStatus':
    case 'paymentStatus':
      return 'text-center'
    case 'actions':
      return 'text-right'
    default:
      return 'text-left'
  }
}

function LocationDisplayHeaderButton({
  mode,
  onCycle,
}: {
  mode: OfficialTenantLocationDisplayMode
  onCycle: () => void
}) {
  const label = OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS[mode]
  return (
    <button
      type="button"
      title="Click to change location detail"
      aria-label={`${label}. Click to change location detail`}
      onClick={(event) => {
        event.stopPropagation()
        onCycle()
      }}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        'group inline-flex max-w-full items-center gap-1 rounded-sm px-1 py-0.5 -mx-1 -my-0.5',
        'cursor-pointer text-left transition-colors duration-150',
        'hover:bg-ink/[0.06]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface'
      )}
    >
      <span key={mode} className="location-display-fade min-w-0 truncate">
        {label}
      </span>
      <ChevronsUpDown
        className="h-3 w-3 shrink-0 text-ink-faint transition-transform duration-200 group-hover:text-ink-muted group-hover:rotate-180"
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  )
}

function renderHeaderLabel(
  columnId: TenantTableColumnId,
  locationDisplayMode: OfficialTenantLocationDisplayMode,
  onCycleLocationDisplay: () => void
): ReactNode {
  if (columnId === 'actions') {
    return <span className="sr-only">{TENANT_TABLE_COLUMN_LABELS.actions}</span>
  }
  if (columnId === 'address') {
    return (
      <LocationDisplayHeaderButton
        mode={locationDisplayMode}
        onCycle={onCycleLocationDisplay}
      />
    )
  }
  return TENANT_TABLE_COLUMN_LABELS[columnId]
}

function renderCell(
  columnId: TenantTableColumnId,
  client: Client,
  contract: ContractData | undefined,
  properties: Property[],
  locationDisplayMode: OfficialTenantLocationDisplayMode,
  onRemove: () => void
): ReactNode {
  const property = getTenantAssignedProperty(client, contract, properties)
  const locationValue = getOfficialTenantLocationDisplayValue(property, locationDisplayMode)
  const leaseStatus = getLeaseStatusDetails(client, contract)

  switch (columnId) {
    case 'tenant':
      return (
        <td key={columnId} className="px-3 py-2.5 align-top sm:px-4">
          <div className="min-w-0">
            <TenantNameWithLeaseIcons client={client} contract={contract}>
              <Link
                to={`/studio/clients/${client.id}`}
                className="min-w-0 truncate font-semibold text-ink hover:text-brand hover:underline"
                title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
              >
                {client.name}
              </Link>
            </TenantNameWithLeaseIcons>
            <p className="truncate pl-2 text-xs text-ink-muted">
              Official since{' '}
              {formatDate(client.officialClientSince || client.createdAt)}
            </p>
            <p className="truncate pl-2 text-xs text-ink-faint md:hidden">{client.email}</p>
          </div>
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
              title={`View tenant at ${locationValue}`}
            >
              <span key={locationDisplayMode} className="location-display-fade inline">
                {locationValue}
              </span>
            </Link>
          </div>
        </td>
      )
    case 'leaseStatus':
      return (
        <td key={columnId} className="px-3 py-2.5 text-center align-middle sm:px-4">
          <div className="mx-auto flex max-w-[14rem] flex-col items-center gap-0.5">
            <LeaseStatusBadge details={leaseStatus} />
            {leaseStatus.endDate ? (
              <span className="text-[11px] leading-snug text-ink-muted">
                Ends {formatDate(leaseStatus.endDate)}
              </span>
            ) : null}
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
  locationDisplayMode: controlledLocationMode,
  onLocationDisplayModeChange,
}: ClientTableProps) {
  const { getContractForClient, refresh, properties } = useApp()
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null)
  const [uncontrolledOrder, setUncontrolledOrder] = useState(loadTenantTableColumnOrder)
  const [uncontrolledLocationMode, setUncontrolledLocationMode] = useState(
    loadOfficialTenantLocationDisplayMode
  )
  const [dragOverId, setDragOverId] = useState<TenantTableColumnId | null>(null)
  const [draggingId, setDraggingId] = useState<TenantTableColumnId | null>(null)

  const columnOrder = controlledOrder ?? uncontrolledOrder
  const locationDisplayMode = controlledLocationMode ?? uncontrolledLocationMode

  const setColumnOrder = (next: TenantTableColumnId[]) => {
    saveTenantTableColumnOrder(next)
    if (onColumnOrderChange) onColumnOrderChange(next)
    else setUncontrolledOrder(next)
  }

  const cycleLocationDisplay = () => {
    const next = cycleOfficialTenantLocationDisplayMode(locationDisplayMode)
    saveOfficialTenantLocationDisplayMode(next)
    if (onLocationDisplayModeChange) onLocationDisplayModeChange(next)
    else setUncontrolledLocationMode(next)
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
              properties={properties}
              locationDisplayMode={locationDisplayMode}
              onCycleLocationDisplay={cycleLocationDisplay}
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
                      {renderHeaderLabel(columnId, locationDisplayMode, cycleLocationDisplay)}
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
                      renderCell(
                        columnId,
                        client,
                        contract,
                        properties,
                        locationDisplayMode,
                        () => setRemoveTarget(client)
                      )
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
