import { useState, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { LeaseCompleteTag } from './LeaseCompleteTag'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { OccupancyStatusChip } from './OccupancyStatusChip'
import { clientOccupancyTagProps } from './OccupancyPreferenceTag'
import { ApplicantPartyTag } from './ApplicantPartyTag'
import { OfficialTenantContactLinks } from './OfficialTenantContactLinks'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { TenantLeaseStateIcon } from './TenantLeaseStateIcon'
import { RemoveClientModal } from './RemoveClientModal'
import { AddressText } from '@/components/ui/AddressText'
import { EditColumnsArrangeBanner } from '@/components/ui/EditColumnsArrangeBanner'
import { ColumnArrangeHighlight } from '@/components/ui/ColumnArrangeHighlight'
import { EditColumnsRemoveButton } from '@/components/ui/EditColumnsRemoveButton'
import { EditColumnsReorderButtons } from '@/components/ui/EditColumnsReorderButtons'
import { useApp } from '@/context/AppContext'
import { useArrangeTableColumns } from '@/hooks/useArrangeTableColumns'
import { columnArrangeOutlineClass } from '@/lib/columnArrangeOutline'
import {
  getLeaseStatusDetails,
  getTenantAddress,
  isAwaitingDeposit,
  isLeaseCompleteTenant,
} from '@/lib/clientUtils'
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
  nudgeTenantTableColumn,
  resetTenantTableColumnOrder,
  restoreTenantTableColumn,
  saveTenantTableColumnOrder,
  TENANT_TABLE_COLUMN_LABELS,
  tenantTableColumnWidths,
  withTenantArrangementColumn,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'
import {
  sectionTileGridClassName,
  useMobileTileColumns,
  type MobileTileColumns,
} from '@/lib/mobileTileColumns'
import { leaseTileScaleStyle } from '@/lib/tileScale'
import { confirmClientPayment } from '@/lib/timelineApi'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import { matchesDashboardFilter, type DashboardFilter } from '@/lib/dashboardFilters'
import {
  officialTenantRowAnchorId,
} from '@/lib/officialTenantSpotlight'
import { getOccupancyShareDetail } from '@/lib/occupancyStatusFilter'
import type { Client, ContractData, Property } from '@/types'

export type ClientTableViewMode = 'tile' | 'spreadsheet'

interface ClientTableProps {
  clients: Client[]
  highlightFilter?: DashboardFilter | null
  /** Client IDs to spotlight (lease import / re-highlight). Dims non-matching when set. */
  highlightedIds?: ReadonlySet<string> | null
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
  /** Mobile tiles per row (1 or 2). Defaults to the shared persisted preference. */
  mobileTileColumns?: MobileTileColumns
  onMobileTileColumnsChange?: (columns: MobileTileColumns) => void
  /**
   * When set (Tile View on desktop), scales Official Tenants tiles like Lease Agreements.
   * Pass `useTileScale(...).factor` from the page.
   */
  tileScaleFactor?: number
  /**
   * When true, show the Arrangement column to the right of Tenant
   * (Show Arrangements). Off by default — Display Settings control.
   */
  showOccupancyStatus?: boolean
  /**
   * Parent already frames the table (e.g. dashboard Card matching Display Settings).
   * Skips the spreadsheet’s own border/radius so the outer frame is the only chrome.
   */
  framed?: boolean
  /** Opens Tenant Details for the selected official tenant. */
  onOpenTenantDetails: (tenantId: string) => void
}

function headerVisibilityClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'contact':
      return 'hidden md:table-cell'
    case 'arrangement':
      return ''
    default:
      return ''
  }
}

function headerAlignClass(columnId: TenantTableColumnId): string {
  switch (columnId) {
    case 'paymentStatus':
      return 'text-center'
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
  allClients: Client[],
  properties: Property[],
  getContract: (clientId: string) => ContractData | undefined,
  onRemove: () => void,
  onOpenTenantDetails: (tenantId: string) => void,
  onConfirmPayment: (clientId: string) => void,
  confirmingPayment: boolean,
  showOccupancyStatus: boolean,
  arrangeClassName = ''
): ReactNode {
  const addressValue = getFullPropertyAddress(client, contract, properties)
  const leaseStatus = getLeaseStatusDetails(client, contract)
  const awaitingDeposit = isAwaitingDeposit(client, contract)
  const leaseComplete = isLeaseCompleteTenant(client, contract)
  const occupancyProps = clientOccupancyTagProps(
    client,
    getTenantAssignedProperty(client, contract, properties)
  )
  const shareDetail = getOccupancyShareDetail(
    client,
    allClients,
    getContract,
    properties
  )

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
            <div className="flex min-w-0 items-start gap-2">
              <div className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                <TenantLeaseStateIcon details={leaseStatus} />
                <button
                  type="button"
                  onClick={() => onOpenTenantDetails(client.id)}
                  className="min-w-0 truncate text-left text-base font-semibold text-ink hover:text-brand hover:underline"
                  title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
                >
                  {client.name}
                </button>
              </div>
            </div>
            <OfficialTenantContactLinks client={client} />
            {leaseComplete ? (
              <div className="mt-1.5">
                <LeaseCompleteTag clientId={client.id} />
              </div>
            ) : null}
          </div>
        </td>
      )
    case 'arrangement':
      return (
        <td
          key={columnId}
          className={cn(
            'overflow-visible px-3 py-2.5 align-top transition-[background-color,box-shadow,opacity] sm:px-4',
            arrangeClassName
          )}
        >
          {showOccupancyStatus ? (
            <div className="flex min-w-0 flex-wrap gap-1">
              <OccupancyStatusChip
                {...occupancyProps}
                shareDetail={shareDetail}
                onOccupantClick={onOpenTenantDetails}
              />
              <ApplicantPartyTag partyType={client.applicantPartyType} />
            </div>
          ) : null}
        </td>
      )
    case 'contact':
      return (
        <td
          key={columnId}
          className={cn(
            'hidden px-3 py-2.5 align-middle transition-[background-color,box-shadow,opacity] md:table-cell sm:px-4',
            arrangeClassName
          )}
        >
          <div className="min-w-0 overflow-visible">
            <LeaseStatusBadge
              details={leaseStatus}
              onConfirmPayment={
                awaitingDeposit ? () => onConfirmPayment(client.id) : undefined
              }
              confirmingPayment={confirmingPayment}
            />
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
              <AddressText address={addressValue} />
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
          <PaymentStatusDateTags
            client={client}
            contract={contract}
            onConfirmPayment={
              awaitingDeposit ? () => onConfirmPayment(client.id) : undefined
            }
            confirmingPayment={confirmingPayment}
          />
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
            {awaitingDeposit ? (
              <button
                type="button"
                onClick={() => onConfirmPayment(client.id)}
                disabled={confirmingPayment}
                className={cn(
                  tableViewLinkSubtleClass,
                  'text-accent hover:text-accent'
                )}
                title={`Confirm deposit payment complete for ${client.name}`}
                aria-label={`Confirm payment complete for ${client.name}`}
              >
                {confirmingPayment ? (
                  <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
                )}
                Confirm Payment Complete
              </button>
            ) : null}
            {leaseComplete ? (
              <button
                type="button"
                className={cn(tableViewLinkSubtleClass, 'text-accent hover:text-accent')}
                onClick={onRemove}
                title={`Remove ${client.name}`}
                aria-label={`Remove tenant ${client.name}`}
              >
                Remove Tenant
              </button>
            ) : null}
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
  highlightedIds = null,
  viewMode,
  arrangeColumns = false,
  onArrangeDone,
  columnOrder: controlledOrder,
  onColumnOrderChange,
  mobileTileColumns: controlledMobileColumns,
  onMobileTileColumnsChange: _onMobileTileColumnsChange,
  tileScaleFactor,
  showOccupancyStatus = false,
  framed = false,
  onOpenTenantDetails,
}: ClientTableProps) {
  const { clients: allClients, getContractForClient, refresh, properties } = useApp()
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null)
  const [confirmingClientId, setConfirmingClientId] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [uncontrolledOrder, setUncontrolledOrder] = useState(loadTenantTableColumnOrder)
  const { columns: uncontrolledMobileColumns } = useMobileTileColumns()

  const columnOrder = controlledOrder ?? uncontrolledOrder
  const displayColumnOrder = withTenantArrangementColumn(
    columnOrder,
    showOccupancyStatus
  )
  const mobileTileColumns = controlledMobileColumns ?? uncontrolledMobileColumns

  const handleConfirmPayment = async (clientId: string) => {
    if (confirmingClientId) return
    setConfirmingClientId(clientId)
    setConfirmError('')
    try {
      await confirmClientPayment(clientId)
      await refresh()
    } catch (err) {
      setConfirmError(
        err instanceof ApiError ? err.message : 'Could not confirm deposit payment.'
      )
    } finally {
      setConfirmingClientId(null)
    }
  }

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
    columnOrder: displayColumnOrder,
    onColumnOrderChange: setColumnOrder,
    moveColumn: moveTenantTableColumn,
    isPinned: (id) => id === 'actions' || id === 'arrangement',
  })

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

  const handleNudgeColumn = (
    columnId: TenantTableColumnId,
    direction: -1 | 1
  ) => {
    const next = nudgeTenantTableColumn(columnOrder, columnId, direction)
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
  const columnWidths = tenantTableColumnWidths(displayColumnOrder)
  const reorderableColumnIds = displayColumnOrder.filter(
    (id) => id !== 'actions' && id !== 'arrangement'
  )

  const showTiles = viewMode ? viewMode === 'tile' : null
  const showSpreadsheet = viewMode ? viewMode === 'spreadsheet' : null
  const tilesHiddenClass =
    showTiles === false ? 'hidden' : showTiles === null ? 'md:hidden' : undefined
  const tileGrid = (
    <div
      className={cn(
        'min-w-0',
        sectionTileGridClassName(mobileTileColumns),
        'section-tile-grid--fill'
      )}
    >
      {clients.map((client) => {
        const idSpotlight = Boolean(highlightedIds?.has(client.id))
        const filterSpotlight =
          highlightFilter !== null && matchesDashboardFilter(client, highlightFilter)
        const highlighted = idSpotlight || filterSpotlight
        const dimmed =
          (highlightedIds != null && highlightedIds.size > 0 && !idSpotlight) ||
          (highlightFilter !== null && !filterSpotlight)

        return (
          <ClientTableMobileCard
            key={client.id}
            client={client}
            contract={getContractForClient(client.id)}
            clients={allClients}
            properties={properties}
            getContract={getContractForClient}
            highlighted={highlighted}
            dimmed={dimmed}
            showOccupancyStatus={showOccupancyStatus}
            onRemove={() => setRemoveTarget(client)}
            onOpenTenantDetails={onOpenTenantDetails}
            onConfirmPayment={() => handleConfirmPayment(client.id)}
            confirmingPayment={confirmingClientId === client.id}
          />
        )
      })}
    </div>
  )

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
      {confirmError ? (
        <p className="mb-2 text-sm text-accent" role="alert">
          {confirmError}
        </p>
      ) : null}
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
          'min-w-0 overflow-hidden',
          !framed &&
            'rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[color:var(--card-border,var(--line))] bg-surface-paper',
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
              columnOrder={displayColumnOrder}
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
              {displayColumnOrder.map((columnId) => (
                <col key={columnId} style={{ width: columnWidths[columnId] }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
                {displayColumnOrder.map((columnId) => {
                  const canArrange =
                    arrangeColumns &&
                    columnId !== 'actions' &&
                    columnId !== 'arrangement'
                  const isSelected = arrangeColumns && selectedColumnId === columnId
                  const showRemove = isSelected && canRemoveSelected
                  const reorderIndex = reorderableColumnIds.findIndex(
                    (id) => id === columnId
                  )
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
                        {canArrange ? (
                          <EditColumnsReorderButtons
                            columnLabel={TENANT_TABLE_COLUMN_LABELS[columnId]}
                            canMoveUp={reorderIndex > 0}
                            canMoveDown={
                              reorderIndex >= 0 &&
                              reorderIndex < reorderableColumnIds.length - 1
                            }
                            onMoveUp={() => handleNudgeColumn(columnId, -1)}
                            onMoveDown={() => handleNudgeColumn(columnId, 1)}
                          />
                        ) : null}
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
                const idSpotlight = Boolean(highlightedIds?.has(client.id))
                const filterSpotlight =
                  highlightFilter !== null && matchesDashboardFilter(client, highlightFilter)
                const highlighted = idSpotlight || filterSpotlight
                const dimmed =
                  (highlightedIds != null && highlightedIds.size > 0 && !idSpotlight) ||
                  (highlightFilter !== null && !filterSpotlight)
                return (
                  <tr
                    key={client.id}
                    id={officialTenantRowAnchorId(client.id)}
                    className={cn(
                      'transition-[background-color,opacity,box-shadow]',
                      idSpotlight && 'official-tenant-row--spotlight',
                      highlighted &&
                        !idSpotlight &&
                        'bg-brand/10 ring-1 ring-inset ring-brand/40 hover:bg-brand/15',
                      dimmed && 'opacity-40 hover:bg-surface/80 hover:opacity-55',
                      !highlightFilter &&
                        !(highlightedIds && highlightedIds.size > 0) &&
                        !arrangeColumns &&
                        'hover:bg-surface'
                    )}
                  >
                    {displayColumnOrder.map((columnId) =>
                      renderCell(
                        columnId,
                        client,
                        contract,
                        allClients,
                        properties,
                        getContractForClient,
                        () => setRemoveTarget(client),
                        onOpenTenantDetails,
                        handleConfirmPayment,
                        confirmingClientId === client.id,
                        showOccupancyStatus,
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
