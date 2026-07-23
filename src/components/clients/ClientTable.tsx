import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronsUpDown, UserMinus, ArrowRight, RotateCcw, Check } from 'lucide-react'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { RemoveClientModal } from './RemoveClientModal'
import { TenantNameWithLeaseIcons } from './TenantLeaseStatusIcons'
import { Button } from '@/components/ui/Button'
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
  resetTenantTableColumnOrder,
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
  /** When true, column headers select and drag whole columns to rearrange the layout. */
  arrangeColumns?: boolean
  /** Exit rearrange mode — shown next to Reset in the arrange banner. */
  onArrangeDone?: () => void
  columnOrder?: TenantTableColumnId[]
  onColumnOrderChange?: (order: TenantTableColumnId[]) => void
  locationDisplayMode?: OfficialTenantLocationDisplayMode
  onLocationDisplayModeChange?: (mode: OfficialTenantLocationDisplayMode) => void
}

function columnOutlineClass(
  columnId: TenantTableColumnId,
  selectedId: TenantTableColumnId | null,
  draggingId: TenantTableColumnId | null,
  edge: 'header' | 'body' | 'footer'
): string {
  const selected = selectedId === columnId
  const dragging = draggingId === columnId
  if (!selected && !dragging) return ''

  const side =
    'shadow-[inset_1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent),inset_-1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent)]'
  const header =
    'shadow-[inset_1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent),inset_-1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent),inset_0_1.5px_0_0_color-mix(in_srgb,var(--brand)_60%,transparent)]'
  const footer =
    'shadow-[inset_1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent),inset_-1.5px_0_0_0_color-mix(in_srgb,var(--brand)_60%,transparent),inset_0_-1.5px_0_0_color-mix(in_srgb,var(--brand)_60%,transparent)]'

  return cn(
    selected && 'bg-brand/[0.07]',
    selected && edge === 'header' && header,
    selected && edge === 'body' && side,
    selected && edge === 'footer' && footer,
    dragging && 'opacity-55'
  )
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
  onCycleLocationDisplay: () => void,
  arrangeColumns: boolean
): ReactNode {
  if (columnId === 'actions') {
    return <span className="sr-only">{TENANT_TABLE_COLUMN_LABELS.actions}</span>
  }
  if (columnId === 'address') {
    if (arrangeColumns) {
      return OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS[locationDisplayMode]
    }
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
  onRemove: () => void,
  arrangeClassName = ''
): ReactNode {
  const property = getTenantAssignedProperty(client, contract, properties)
  const locationValue = getOfficialTenantLocationDisplayValue(property, locationDisplayMode)
  const leaseStatus = getLeaseStatusDetails(client, contract)

  switch (columnId) {
    case 'tenant':
      return (
        <td
          key={columnId}
          className={cn(
            'px-3 py-2.5 align-top transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
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
          className={cn(
            'hidden px-3 py-2.5 align-middle whitespace-normal break-words text-ink-muted transition-[background-color,box-shadow,opacity] md:table-cell sm:px-4',
            arrangeClassName
          )}
        >
          <div className="flex min-w-0 items-center">
            <span title={client.email}>{client.email}</span>
          </div>
        </td>
      )
    case 'address':
      return (
        <td
          key={columnId}
          className={cn(
            'py-2.5 pl-4 pr-3 align-middle transition-[background-color,box-shadow,opacity] sm:pl-5 sm:pr-4',
            arrangeClassName
          )}
        >
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
        <td
          key={columnId}
          className={cn(
            'px-3 py-2.5 text-center align-middle transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
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
        <td
          key={columnId}
          className={cn(
            'overflow-visible px-3 py-2.5 text-center align-middle transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
          <PaymentStatusDateTags client={client} contract={contract} />
        </td>
      )
    case 'actions':
      return (
        <td
          key={columnId}
          className={cn(
            'px-3 py-2.5 align-top transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
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

function findReorderTarget(
  table: HTMLTableElement,
  order: TenantTableColumnId[],
  clientX: number
): TenantTableColumnId | null {
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))
  for (let index = 0; index < headers.length; index += 1) {
    const columnId = order[index]
    if (!columnId || columnId === 'actions') continue
    const rect = headers[index].getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right) return columnId
  }
  return null
}

export function ClientTable({
  clients,
  highlightFilter = null,
  arrangeColumns = false,
  onArrangeDone,
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
  const [selectedColumnId, setSelectedColumnId] = useState<TenantTableColumnId | null>(null)
  const [draggingId, setDraggingId] = useState<TenantTableColumnId | null>(null)
  const [pointerTracking, setPointerTracking] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)
  const columnOrderRef = useRef<TenantTableColumnId[]>([])
  const dragSessionRef = useRef<{
    columnId: TenantTableColumnId
    startX: number
    startY: number
    moved: boolean
    wasSelected: boolean
  } | null>(null)

  const columnOrder = controlledOrder ?? uncontrolledOrder
  const locationDisplayMode = controlledLocationMode ?? uncontrolledLocationMode
  columnOrderRef.current = columnOrder

  const setColumnOrder = (next: TenantTableColumnId[]) => {
    saveTenantTableColumnOrder(next)
    if (onColumnOrderChange) onColumnOrderChange(next)
    else setUncontrolledOrder(next)
  }
  const setColumnOrderRef = useRef(setColumnOrder)
  setColumnOrderRef.current = setColumnOrder

  const cycleLocationDisplay = () => {
    const next = cycleOfficialTenantLocationDisplayMode(locationDisplayMode)
    saveOfficialTenantLocationDisplayMode(next)
    if (onLocationDisplayModeChange) onLocationDisplayModeChange(next)
    else setUncontrolledLocationMode(next)
  }

  useEffect(() => {
    if (!arrangeColumns) {
      setSelectedColumnId(null)
      setDraggingId(null)
      setPointerTracking(false)
      dragSessionRef.current = null
    }
  }, [arrangeColumns])

  useEffect(() => {
    if (!pointerTracking) return

    const onPointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current
      const table = tableRef.current
      if (!session || !table) return

      if (!session.moved) {
        const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY)
        if (distance < 4) return
        session.moved = true
        setDraggingId(session.columnId)
      }

      const targetId = findReorderTarget(table, columnOrderRef.current, event.clientX)
      if (!targetId || targetId === session.columnId) return
      const next = moveTenantTableColumn(columnOrderRef.current, session.columnId, targetId)
      if (next.join() !== columnOrderRef.current.join()) setColumnOrderRef.current(next)
    }

    const endDrag = () => {
      const session = dragSessionRef.current
      dragSessionRef.current = null
      setPointerTracking(false)
      setDraggingId(null)
      if (session && !session.moved && session.wasSelected) {
        setSelectedColumnId(null)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [pointerTracking])

  if (clients.length === 0) {
    return null
  }

  const handleHeaderPointerDown =
    (columnId: TenantTableColumnId) => (event: ReactPointerEvent<HTMLTableCellElement>) => {
      if (!arrangeColumns || columnId === 'actions' || event.button !== 0) return
      event.preventDefault()
      dragSessionRef.current = {
        columnId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        wasSelected: selectedColumnId === columnId,
      }
      setSelectedColumnId(columnId)
      setPointerTracking(true)
    }

  const handleResetLayout = () => {
    const defaults = resetTenantTableColumnOrder()
    if (onColumnOrderChange) onColumnOrderChange(defaults)
    else setUncontrolledOrder(defaults)
    setSelectedColumnId(null)
    setDraggingId(null)
    setPointerTracking(false)
    dragSessionRef.current = null
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-1.5 sm:px-4">
            <p className="min-w-0 flex-1 text-[11px] text-ink-muted">
              Select a column by clicking its header to drag it as a group; actions will follow
              your drag. You can reset the layout at any time.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                title="Restore the default column layout."
                aria-label="Restore the default column layout."
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </Button>
              {onArrangeDone ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onArrangeDone}
                  title="Done rearranging columns"
                  aria-label="Done rearranging columns"
                  className="shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Done
                </Button>
              ) : null}
            </div>
          </div>
        )}
        <div className="table-fit-shell">
          <table
            ref={tableRef}
            className="w-full min-w-0 table-fixed text-left text-sm"
          >
            <colgroup>
              {columnOrder.map((columnId) => (
                <col key={columnId} style={{ width: TENANT_TABLE_COLUMN_WIDTHS[columnId] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
                {columnOrder.map((columnId) => {
                  const canArrange = arrangeColumns && columnId !== 'actions'
                  return (
                    <th
                      key={columnId}
                      onPointerDown={handleHeaderPointerDown(columnId)}
                      className={cn(
                        'label-caps px-3 py-2.5 transition-[background-color,box-shadow,opacity] sm:px-4',
                        columnId === 'address' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
                        headerAlignClass(columnId),
                        headerVisibilityClass(columnId),
                        canArrange && 'cursor-grab select-none touch-none active:cursor-grabbing',
                        columnOutlineClass(
                          columnId,
                          selectedColumnId,
                          draggingId,
                          'header'
                        )
                      )}
                      aria-selected={
                        arrangeColumns && selectedColumnId === columnId ? true : undefined
                      }
                      aria-grabbed={draggingId === columnId || undefined}
                    >
                      {renderHeaderLabel(
                        columnId,
                        locationDisplayMode,
                        cycleLocationDisplay,
                        arrangeColumns
                      )}
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
              {clients.map((client, rowIndex) => {
                const contract = getContractForClient(client.id)
                const highlighted =
                  highlightFilter !== null && matchesDashboardFilter(client, highlightFilter)
                const dimmed = highlightFilter !== null && !highlighted
                const edge = rowIndex === clients.length - 1 ? 'footer' : 'body'

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
                        () => setRemoveTarget(client),
                        columnOutlineClass(
                          columnId,
                          selectedColumnId,
                          draggingId,
                          edge
                        )
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
