import { useState, type ReactNode } from 'react'
import { UserMinus, ArrowRight } from 'lucide-react'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { RemoveClientModal } from './RemoveClientModal'
import { EditColumnsArrangeBanner } from '@/components/ui/EditColumnsArrangeBanner'
import { ColumnArrangeHighlight } from '@/components/ui/ColumnArrangeHighlight'
import { EditColumnsRemoveButton } from '@/components/ui/EditColumnsRemoveButton'
import { useApp } from '@/context/AppContext'
import { useArrangeTableColumns } from '@/hooks/useArrangeTableColumns'
import { columnArrangeOutlineClass } from '@/lib/columnArrangeOutline'
import {
  getLeaseStatusDetails,
  getTenantAddress,
} from '@/lib/clientUtils'
import {
  cycleOfficialTenantContactDisplayMode,
  getOfficialTenantContactDisplayValue,
  loadOfficialTenantContactDisplayMode,
  saveOfficialTenantContactDisplayMode,
  type OfficialTenantContactDisplayMode,
} from '@/lib/officialTenantContactDisplay'
import {
  getOfficialTenantLocationDisplayValue,
  getTenantAssignedProperty,
  LOCATION_DISPLAY_MISSING,
} from '@/lib/officialTenantLocationDisplay'
import {
  hiddenTenantTableColumns,
  hideTenantTableColumn,
  loadTenantTableColumnOrder,
  moveTenantTableColumn,
  resetTenantTableColumnOrder,
  restoreTenantTableColumn,
  saveTenantTableColumnOrder,
  TENANT_TABLE_COLUMN_LABELS,
  tenantTableColumnWidths,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import {
  sectionTileGridClassName,
  useMobileTileColumns,
  type MobileTileColumns,
} from '@/lib/mobileTileColumns'
import { leaseTileScaleStyle } from '@/lib/tileScale'
import { cn } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import { matchesDashboardFilter, type DashboardFilter } from '@/lib/dashboardFilters'
import type { Client, ContractData, Property } from '@/types'

export type ClientTableViewMode = 'tile' | 'spreadsheet'

interface ClientTableProps {
  clients: Client[]
  highlightFilter?: DashboardFilter | null
  /**
   * When set, shows only tiles or only the spreadsheet (same tenant data).
   * When omitted, tiles show below `md` and the spreadsheet at `md+`.
   */
  viewMode?: ClientTableViewMode
  /** When true, column headers select and drag whole columns to edit the layout. */
  arrangeColumns?: boolean
  /** Exit Edit Columns mode — shown next to Reset in the edit banner. */
  onArrangeDone?: () => void
  columnOrder?: TenantTableColumnId[]
  onColumnOrderChange?: (order: TenantTableColumnId[]) => void
  contactDisplayMode?: OfficialTenantContactDisplayMode
  onContactDisplayModeChange?: (mode: OfficialTenantContactDisplayMode) => void
  /** Mobile tiles per row (1 or 2). Defaults to the shared persisted preference. */
  mobileTileColumns?: MobileTileColumns
  onMobileTileColumnsChange?: (columns: MobileTileColumns) => void
  /**
   * When set (Tile View on desktop), scales Official Tenants tiles like Lease Agreements.
   * Pass `useTileScale(...).factor` from the page.
   */
  tileScaleFactor?: number
  /** Opens Tenant Details for the selected official tenant. */
  onOpenTenantDetails: (tenantId: string) => void
}

function headerVisibilityClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'contact':
      return 'hidden md:table-cell'
    default:
      return ''
  }
}

function headerAlignClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'paymentStatus':
      return 'text-right'
    case 'actions':
      return 'text-right'
    default:
      return 'text-left'
  }
}

/** Full property address for Official Tenants — never a partial street/city/zip slice. */
function getFullPropertyAddress(
  client: Client,
  contract: ContractData | undefined,
  properties: Property[]
): string {
  const property = getTenantAssignedProperty(client, contract, properties)
  const fromProperty = getOfficialTenantLocationDisplayValue(property, 'address')
  if (fromProperty !== LOCATION_DISPLAY_MISSING) return fromProperty
  const fallback = getTenantAddress(client, contract)
  return fallback === '—' ? LOCATION_DISPLAY_MISSING : fallback
}

function renderHeaderLabel(columnId: TenantTableColumnId): ReactNode {
  if (columnId === 'actions') {
    return <span className="sr-only">{TENANT_TABLE_COLUMN_LABELS.actions}</span>
  }
  return (
    <span className="whitespace-nowrap">{TENANT_TABLE_COLUMN_LABELS[columnId]}</span>
  )
}

function renderCell(
  columnId: TenantTableColumnId,
  client: Client,
  contract: ContractData | undefined,
  properties: Property[],
  contactDisplayMode: OfficialTenantContactDisplayMode,
  onCycleContactDisplay: () => void,
  onRemove: () => void,
  onOpenTenantDetails: (tenantId: string) => void,
  arrangeClassName = ''
): ReactNode {
  const addressValue = getFullPropertyAddress(client, contract, properties)
  const contactValue = getOfficialTenantContactDisplayValue(client, contactDisplayMode)
  const leaseStatus = getLeaseStatusDetails(client, contract)

  switch (columnId) {
    case 'tenant':
      return (
        <td
          key={columnId}
          className={cn(
            'overflow-visible px-3 py-2.5 align-top transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenTenantDetails(client.id)}
              className="min-w-0 truncate text-left text-base font-semibold text-ink hover:text-brand hover:underline"
              title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
            >
              {client.name}
            </button>
            <div className="mt-1">
              <LeaseStatusBadge details={leaseStatus} />
            </div>
          </div>
        </td>
      )
    case 'contact':
      return (
        <td
          key={columnId}
          className={cn(
            'hidden px-3 py-2.5 align-middle whitespace-normal break-words text-ink-muted transition-[background-color,box-shadow,opacity] md:table-cell sm:px-4',
            arrangeClassName
          )}
        >
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              onClick={onCycleContactDisplay}
              title={`Click to switch to ${contactDisplayMode === 'email' ? 'phone' : 'email'}`}
              aria-label={`${contactValue}. Click to switch between email and phone`}
              className={cn(
                'min-w-0 max-w-full break-words rounded-sm text-left transition-colors duration-150',
                'hover:bg-ink/[0.06] hover:text-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface'
              )}
            >
              <span key={contactDisplayMode} className="location-display-fade">
                {contactValue}
              </span>
            </button>
          </div>
        </td>
      )
    case 'address':
      return (
        <td
          key={columnId}
          className={cn(
            'overflow-visible py-2.5 pl-4 pr-3 align-middle transition-[background-color,box-shadow,opacity] sm:pl-5 sm:pr-4',
            arrangeClassName
          )}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenTenantDetails(client.id)}
              className="official-tenant-address min-w-0 w-full break-words text-left font-bold leading-snug text-ink hover:text-brand hover:underline"
              title={`View tenant at ${addressValue}`}
            >
              {addressValue}
            </button>
          </div>
        </td>
      )
    case 'paymentStatus':
      return (
        <td
          key={columnId}
          className={cn(
            'overflow-visible px-3 py-2.5 text-right align-middle transition-[background-color,box-shadow,opacity] sm:px-4',
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
            <button
              type="button"
              onClick={() => onOpenTenantDetails(client.id)}
              className={tableViewLinkSubtleClass}
              title={`View ${client.name}`}
            >
              View
              <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </td>
      )
  }
}

export function ClientTable({
  clients,
  highlightFilter = null,
  viewMode,
  arrangeColumns = false,
  onArrangeDone,
  columnOrder: controlledOrder,
  onColumnOrderChange,
  contactDisplayMode: controlledContactMode,
  onContactDisplayModeChange,
  mobileTileColumns: controlledMobileColumns,
  onMobileTileColumnsChange: _onMobileTileColumnsChange,
  tileScaleFactor,
  onOpenTenantDetails,
}: ClientTableProps) {
  const { getContractForClient, refresh, properties } = useApp()
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null)
  const [uncontrolledOrder, setUncontrolledOrder] = useState(loadTenantTableColumnOrder)
  const [uncontrolledContactMode, setUncontrolledContactMode] = useState(
    loadOfficialTenantContactDisplayMode
  )
  const { columns: uncontrolledMobileColumns } = useMobileTileColumns()

  const columnOrder = controlledOrder ?? uncontrolledOrder
  const contactDisplayMode = controlledContactMode ?? uncontrolledContactMode
  const mobileTileColumns = controlledMobileColumns ?? uncontrolledMobileColumns

  const setColumnOrder = (next: TenantTableColumnId[]) => {
    saveTenantTableColumnOrder(next)
    if (onColumnOrderChange) onColumnOrderChange(next)
    else setUncontrolledOrder(next)
  }

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
    columnOrder,
    onColumnOrderChange: setColumnOrder,
    moveColumn: moveTenantTableColumn,
    isPinned: (id) => id === 'actions',
  })

  const cycleContactDisplay = () => {
    const next = cycleOfficialTenantContactDisplayMode(contactDisplayMode)
    saveOfficialTenantContactDisplayMode(next)
    if (onContactDisplayModeChange) onContactDisplayModeChange(next)
    else setUncontrolledContactMode(next)
  }

  if (clients.length === 0) {
    return null
  }

  const handleResetLayout = () => {
    const defaults = resetTenantTableColumnOrder()
    if (onColumnOrderChange) onColumnOrderChange(defaults)
    else setUncontrolledOrder(defaults)
    clearArrangeInteraction()
  }

  const handleHideColumn = (columnId: TenantTableColumnId) => {
    const next = hideTenantTableColumn(columnOrder, columnId)
    if (next.join() === columnOrder.join()) return
    setColumnOrder(next)
    clearArrangeInteraction()
  }

  const handleRestoreColumn = (columnId: string) => {
    const next = restoreTenantTableColumn(
      columnOrder,
      columnId as TenantTableColumnId
    )
    if (next.join() === columnOrder.join()) return
    setColumnOrder(next)
  }

  const removedColumns = arrangeColumns
    ? hiddenTenantTableColumns(columnOrder).map((id) => ({
        id,
        label: TENANT_TABLE_COLUMN_LABELS[id],
      }))
    : []
  const visibleDataColumnCount = columnOrder.filter((id) => id !== 'actions').length
  const canRemoveSelected = visibleDataColumnCount > 1
  const columnWidths = tenantTableColumnWidths(columnOrder)

  const showTiles = viewMode ? viewMode === 'tile' : null
  const showSpreadsheet = viewMode ? viewMode === 'spreadsheet' : null
  const tilesHiddenClass =
    showTiles === false ? 'hidden' : showTiles === null ? 'md:hidden' : undefined
  const tileGrid = (
    <div className={cn('min-w-0', sectionTileGridClassName(mobileTileColumns))}>
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
            contactDisplayMode={contactDisplayMode}
            onCycleContactDisplay={cycleContactDisplay}
            highlighted={highlighted}
            dimmed={dimmed}
            onRemove={() => setRemoveTarget(client)}
            onOpenTenantDetails={onOpenTenantDetails}
          />
        )
      })}
    </div>
  )

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
      {tileScaleFactor != null ? (
        <div
          className={cn('tile-scale-root', tilesHiddenClass)}
          style={leaseTileScaleStyle(tileScaleFactor)}
        >
          {tileGrid}
        </div>
      ) : (
        <div className={tilesHiddenClass}>{tileGrid}</div>
      )}

      <div
        className={cn(
          'min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper',
          showSpreadsheet === false && 'hidden',
          showSpreadsheet === null && 'hidden md:block',
          showSpreadsheet === true && 'block'
        )}
      >
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
              columnOrder={columnOrder}
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
              {columnOrder.map((columnId) => (
                <col key={columnId} style={{ width: columnWidths[columnId] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
                {columnOrder.map((columnId) => {
                  const canArrange = arrangeColumns && columnId !== 'actions'
                  const isSelected = arrangeColumns && selectedColumnId === columnId
                  const showRemove = isSelected && canRemoveSelected
                  return (
                    <th
                      key={columnId}
                      className={cn(
                        'label-caps relative overflow-visible px-3 py-2.5 sm:px-4',
                        columnId === 'address' && 'pl-4 pr-3 sm:pl-5 sm:pr-4',
                        headerAlignClass(columnId),
                        headerVisibilityClass(columnId),
                        canArrange && 'active:cursor-grabbing',
                        columnArrangeOutlineClass(
                          columnId,
                          selectedColumnId,
                          hoveredColumnId,
                          draggingId
                        )
                      )}
                      aria-selected={isSelected ? true : undefined}
                      aria-grabbed={draggingId === columnId || undefined}
                    >
                      <span
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 whitespace-nowrap',
                          headerAlignClass(columnId) === 'text-center' && 'justify-center',
                          headerAlignClass(columnId) === 'text-right' && 'justify-end'
                        )}
                      >
                        {renderHeaderLabel(columnId)}
                        {showRemove ? (
                          <EditColumnsRemoveButton
                            columnLabel={TENANT_TABLE_COLUMN_LABELS[columnId]}
                            onRemove={() => handleHideColumn(columnId)}
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
                      !highlightFilter && !arrangeColumns && 'hover:bg-surface'
                    )}
                  >
                    {columnOrder.map((columnId) =>
                      renderCell(
                        columnId,
                        client,
                        contract,
                        properties,
                        contactDisplayMode,
                        cycleContactDisplay,
                        () => setRemoveTarget(client),
                        onOpenTenantDetails,
                        columnArrangeOutlineClass(
                          columnId,
                          selectedColumnId,
                          hoveredColumnId,
                          draggingId
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
