import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  Clock,
  Columns3,
  DollarSign,
  LayoutGrid,
  LayoutList,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import {
  PaymentTable,
  type PaymentSortColumn,
} from '@/components/payments/PaymentTable'
import { SendTenantMessageSection } from '@/components/payments/SendTenantMessageSection'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MobileTileColumnsControl } from '@/components/ui/MobileTileColumnsControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { getFirstName, shouldShowInOfficialTenants } from '@/lib/clientUtils'
import {
  formatDaysRemainingLabel,
  formatLeaseLengthLabel,
} from '@/lib/leaseSchedule'
import { paymentPartnerLogoByProvider } from '@/lib/paymentPartnerLogos'
import {
  getPaymentStatusFilterLabel,
  nextPaymentMethodFilter,
  nextPaymentStatusFilter,
  parsePaymentStatusQuery,
  paymentStatusFilterMatchesDisplay,
  paymentStatusFilterToQuery,
  PAYMENT_METHOD_FILTER_BUTTON_WIDTH_CLASS,
  PAYMENT_STATUS_FILTER_BUTTON_WIDTH_CLASS,
  type PaymentStatusFilter,
} from '@/lib/paymentDisplayFilters'
import {
  paymentProviderLabel,
  resolveLastTransactionPaymentProvider,
} from '@/lib/paymentProvider'
import {
  loadPaymentVisibleColumns,
  savePaymentVisibleColumns,
  type PaymentTableColumnId,
} from '@/lib/paymentTableColumns'
import {
  buildTenantPaymentRows,
  displayBadgeLabel,
  displayBadgeStatus,
  formatUsd,
  parsePaymentTenantHash,
  paymentTenantAnchorId,
  summarizePaymentRows,
  type TenantPaymentRow,
} from '@/lib/paymentTenantRows'
import {
  PAYMENT_TILE_SCALE_DEFAULT,
  paymentTileGridClassName,
  paymentTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import {
  sectionTileGridClassName,
  useMobileTileColumns,
} from '@/lib/mobileTileColumns'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import { cn, formatDate } from '@/lib/utils'
import { resolveLandlordSenderName } from '@/lib/publicDemo'
import { confirmClientPayment } from '@/lib/timelineApi'
import type { PaymentProvider } from '@/types'

/** Bumped so the new 100% default applies for existing sessions. */
const PAYMENTS_TILE_SCALE_KEY = 'payments-tile-scale-v2'
const PAYMENTS_VIEW_KEY = 'payments-view-mode'

type PaymentsViewMode = 'tile' | 'spreadsheet'

function readViewModePreference(): PaymentsViewMode {
  try {
    return localStorage.getItem(PAYMENTS_VIEW_KEY) === 'spreadsheet'
      ? 'spreadsheet'
      : 'tile'
  } catch {
    return 'tile'
  }
}

const filterButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] border-2 px-3 text-[10px] font-semibold uppercase tracking-caps transition-colors shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'

function TileDateMeta({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        'payment-tile-card__detail rounded-[var(--radius-sm)] transition-colors duration-300',
        highlighted && 'payment-tile-card__detail--highlight'
      )}
    >
      <p className="tile-card__label">{label}</p>
      <p className="tile-card__value">{value}</p>
    </div>
  )
}

/** Prefer lease contract provider; fall back to last paid invoice provider. */
function paymentMethodForRow(row: TenantPaymentRow): PaymentProvider {
  return resolveLastTransactionPaymentProvider(row.client, row.contract)
}

type PaymentRowWithMethod = TenantPaymentRow & { paymentMethod: PaymentProvider }

export function PaymentsPage() {
  const { clients, contracts, properties, settings, addNote, refresh } = useApp()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [highlightedFocus, setHighlightedFocus] = useState<'last' | 'next' | 'remind' | null>(
    null
  )
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter | null>(
    () => parsePaymentStatusQuery(searchParams.get('status'))
  )
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [methodFilter, setMethodFilter] = useState<PaymentProvider | null>(null)
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<PaymentsViewMode>(readViewModePreference)
  const [arrangeColumns, setArrangeColumns] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<PaymentTableColumnId[]>(
    loadPaymentVisibleColumns
  )
  const [sortColumn, setSortColumn] = useState<PaymentSortColumn>('tenant')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const isMobile = useIsMobileViewport()
  const effectiveViewMode: PaymentsViewMode = isMobile ? 'tile' : viewMode
  const { columns: mobileTileColumns, setColumns: setMobileTileColumns } =
    useMobileTileColumns()
  const { scale, setScale, factor } = useTileScale(
    PAYMENTS_TILE_SCALE_KEY,
    PAYMENT_TILE_SCALE_DEFAULT
  )

  useEffect(() => {
    try {
      localStorage.setItem(PAYMENTS_VIEW_KEY, viewMode)
    } catch {
      /* ignore */
    }
    if (viewMode !== 'spreadsheet') {
      setArrangeColumns(false)
    }
  }, [viewMode])

  useEffect(() => {
    if (isMobile) setArrangeColumns(false)
  }, [isMobile])

  useEffect(() => {
    savePaymentVisibleColumns(visibleColumns)
  }, [visibleColumns])

  useEffect(() => {
    if (visibleColumns.includes(sortColumn)) return
    const fallback = visibleColumns[0]
    if (!fallback) return
    setSortColumn(fallback)
    setSortDirection('asc')
  }, [visibleColumns, sortColumn])

  const rows = useMemo<PaymentRowWithMethod[]>(() => {
    // Same cohort as Official Tenants — every paying tenant must appear in both places
    const officialClients = clients.filter((client) =>
      shouldShowInOfficialTenants(
        client,
        contracts.find((c) => c.clientId === client.id)
      )
    )
    return buildTenantPaymentRows(officialClients, contracts, properties).map((row) => ({
      ...row,
      paymentMethod: paymentMethodForRow(row),
    }))
  }, [clients, contracts, properties])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (
        statusFilter &&
        !paymentStatusFilterMatchesDisplay(statusFilter, row.display)
      ) {
        return false
      }
      if (methodFilter && row.paymentMethod !== methodFilter) return false
      return true
    })
  }, [rows, statusFilter, methodFilter])

  const sortedRows = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...filteredRows].sort((a, b) => {
      const cmp = (left: string | number | null | undefined, right: string | number | null | undefined) => {
        if (left == null && right == null) return 0
        if (left == null) return 1
        if (right == null) return -1
        if (typeof left === 'number' && typeof right === 'number') {
          return (left - right) * dir
        }
        return String(left).localeCompare(String(right), undefined, {
          sensitivity: 'base',
          numeric: true,
        }) * dir
      }
      switch (sortColumn) {
        case 'tenant':
          return cmp(a.client.name, b.client.name)
        case 'address':
          return cmp(a.address, b.address)
        case 'status':
          return cmp(a.statusLabel, b.statusLabel)
        case 'amount':
          return cmp(
            a.remainingBalance ?? a.overdueAmount ?? a.monthlyRent,
            b.remainingBalance ?? b.overdueAmount ?? b.monthlyRent
          )
        case 'method':
          return cmp(a.paymentMethod, b.paymentMethod)
        case 'lastPayment':
          return cmp(a.lastPaymentMadeOn, b.lastPaymentMadeOn)
        case 'nextDue':
          return cmp(a.nextDueDate, b.nextDueDate)
        case 'leaseEnds':
          return cmp(a.leaseEndDate, b.leaseEndDate)
        default:
          return 0
      }
    })
  }, [filteredRows, sortColumn, sortDirection])

  const totals = useMemo(() => summarizePaymentRows(rows), [rows])

  const summarySubtitle =
    clients.length === 0
      ? 'Rent due dates and status for every tenant.'
      : totals.overdueCount > 0
        ? `${totals.overdueCount} overdue · ${formatUsd(totals.overdueTotal)} past due · ${totals.paid} current · ${rows.length} ${rows.length === 1 ? 'tenant' : 'tenants'}.`
        : `${totals.due} due · ${totals.paid} current across ${rows.length} ${rows.length === 1 ? 'tenant' : 'tenants'}.`

  const landlordName = resolveLandlordSenderName(settings)
  const filtersActive = statusFilter != null || methodFilter != null
  const filterButtonLabel =
    (statusFilter ? getPaymentStatusFilterLabel(statusFilter) : null) ??
    (methodFilter ? paymentProviderLabel(methodFilter) : null) ??
    'Filter'

  useEffect(() => {
    setStatusFilter(parsePaymentStatusQuery(searchParams.get('status')))
  }, [searchParams])

  useEffect(() => {
    if (!location.hash) {
      setHighlightedId(null)
      setHighlightedFocus(null)
      return
    }
    const parsed = parsePaymentTenantHash(location.hash)
    if (!parsed) return
    const el = document.getElementById(parsed.anchorId)
    if (!el) return
    setHighlightedId(parsed.anchorId)
    // Keep tile chrome the same size as a normal Overdue gallery visit —
    // never auto-expand the message composer from a deep link.
    setHighlightedFocus(parsed.focus === 'remind' ? null : parsed.focus)
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    const clearHighlight = window.setTimeout(() => {
      setHighlightedId(null)
      setHighlightedFocus(null)
    }, 2500)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearHighlight)
    }
  }, [location.hash, filteredRows])

  function setStatusFilterWithQuery(next: PaymentStatusFilter | null) {
    setStatusFilter(next)
    setSearchParams(
      (params) => {
        const nextParams = new URLSearchParams(params)
        const query = paymentStatusFilterToQuery(next)
        if (query) nextParams.set('status', query)
        else nextParams.delete('status')
        return nextParams
      },
      { replace: true }
    )
  }

  function cycleStatusFilter() {
    setStatusFilterWithQuery(nextPaymentStatusFilter(statusFilter))
  }

  function cycleMethodFilter() {
    setMethodFilter((current) => nextPaymentMethodFilter(current))
  }

  function handleSortChange(column: PaymentSortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortColumn(column)
    setSortDirection('asc')
  }

  function handleMessageSent(clientId: string, tenantLabel: string, message: string) {
    const preview = message.length > 120 ? `${message.slice(0, 117)}…` : message
    addNote(clientId, {
      text: `Overdue rent message drafted to ${tenantLabel} via device Messages: ${preview}`,
      category: 'Payment',
    })
    setSentFeedback((prev) => ({
      ...prev,
      [clientId]: `Message opened in Messages for ${tenantLabel}. Replies stay on your phone.`,
    }))
  }

  const displaySettings =
    clients.length > 0 ? (
      <Card className="w-full max-w-full !px-3 !py-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Display Settings
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterBarOpen((open) => !open)}
              aria-expanded={filterBarOpen}
              aria-controls="payments-filter-options"
              aria-label={
                filtersActive
                  ? `Filter: ${[
                      statusFilter
                        ? getPaymentStatusFilterLabel(statusFilter)
                        : null,
                      methodFilter ? paymentProviderLabel(methodFilter) : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}. Open to change payment filters.`
                  : 'Filter payments by status or payment method'
              }
              title={
                filtersActive
                  ? `Filtered to ${[
                      statusFilter
                        ? getPaymentStatusFilterLabel(statusFilter)
                        : null,
                      methodFilter ? paymentProviderLabel(methodFilter) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}`
                  : 'Filter by payment status or method'
              }
              className={cn(
                filterButtonClass,
                'gap-1.5',
                filterBarOpen || filtersActive
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              {filterButtonLabel}
              {statusFilter && methodFilter ? (
                <span className="max-w-[9rem] truncate normal-case tracking-normal text-ink-muted">
                  · {paymentProviderLabel(methodFilter)}
                </span>
              ) : null}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform',
                  filterBarOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>

            {isMobile ? (
              <MobileTileColumnsControl
                value={mobileTileColumns}
                onChange={setMobileTileColumns}
              />
            ) : null}

            <div
              role="group"
              aria-label="Payments display"
              className="hidden h-9 shrink-0 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-0.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] md:inline-flex"
            >
              <button
                type="button"
                title="Tile View"
                aria-label="Tile View"
                aria-pressed={viewMode === 'tile'}
                onClick={() => setViewMode('tile')}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors',
                  viewMode === 'tile'
                    ? 'bg-brand text-surface-paper'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Tile</span>
              </button>
              <button
                type="button"
                title="Spreadsheet View"
                aria-label="Spreadsheet View"
                aria-pressed={viewMode === 'spreadsheet'}
                onClick={() => setViewMode('spreadsheet')}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2 text-[10px] font-semibold uppercase tracking-caps transition-colors',
                  viewMode === 'spreadsheet'
                    ? 'bg-brand text-surface-paper'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                )}
              >
                <LayoutList className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Spreadsheet</span>
              </button>
            </div>

            {effectiveViewMode === 'spreadsheet' && !arrangeColumns ? (
              <button
                type="button"
                onClick={() => setArrangeColumns(true)}
                aria-pressed={false}
                title="Edit Columns"
                aria-label="Edit Columns"
                className={cn(
                  filterButtonClass,
                  'hidden gap-1.5 md:inline-flex',
                  'border-ink bg-surface-paper text-ink hover:border-brand/50'
                )}
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Edit Columns</span>
              </button>
            ) : null}

            {effectiveViewMode === 'tile' && !isMobile ? (
              <TileScaleControl
                variant="row"
                value={scale}
                onChange={setScale}
                label="Payment tile size"
              />
            ) : null}
          </div>

          {filterBarOpen ? (
            <div
              id="payments-filter-options"
              className="flex flex-col gap-1.5 border-t border-ink/10 pt-1.5"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Payment Status
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cycleStatusFilter}
                      data-onboarding="admin-overdue-rent"
                      aria-label={`Payment status filter: ${getPaymentStatusFilterLabel(statusFilter)}. Click to cycle Any, Paid Rent, Overdue Rent, Paid Early, On Time.`}
                      title="Click to cycle payment status: Any → Paid Rent → Overdue Rent → Paid Early → On Time"
                      className={cn(
                        filterButtonClass,
                        PAYMENT_STATUS_FILTER_BUTTON_WIDTH_CLASS,
                        'shrink-0 justify-center',
                        statusFilter
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {getPaymentStatusFilterLabel(statusFilter)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilterWithQuery(null)}
                      disabled={!statusFilter}
                      aria-label="Reset payment status filter"
                      title="Reset Filters"
                      className={cn(
                        filterButtonClass,
                        'shrink-0',
                        statusFilter
                          ? 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                          : 'cursor-not-allowed border-ink/40 bg-surface text-ink-faint'
                      )}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Payment Method
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={cycleMethodFilter}
                      aria-label={`Payment method filter: ${methodFilter ? paymentProviderLabel(methodFilter) : 'Any'}. Click to cycle Any, Stripe, PayPal, Square, Zelle.`}
                      title="Click to cycle payment method: Any → Stripe → PayPal → Square → Zelle"
                      className={cn(
                        filterButtonClass,
                        PAYMENT_METHOD_FILTER_BUTTON_WIDTH_CLASS,
                        'shrink-0 justify-center',
                        methodFilter
                          ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                          : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                      )}
                    >
                      {methodFilter ? paymentProviderLabel(methodFilter) : 'Any'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodFilter(null)}
                      disabled={!methodFilter}
                      aria-label="Reset payment method filter"
                      title="Reset Filters"
                      className={cn(
                        filterButtonClass,
                        'shrink-0',
                        methodFilter
                          ? 'border-ink bg-surface-paper text-ink hover:border-brand/50'
                          : 'cursor-not-allowed border-ink/40 bg-surface text-ink-faint'
                      )}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {filtersActive && (
            <p className="text-xs text-ink-faint">
              Showing {filteredRows.length} of {rows.length}{' '}
              {rows.length === 1 ? 'payment' : 'payments'}
            </p>
          )}
        </div>
      </Card>
    ) : undefined

  return (
    <div className="w-full min-w-0" data-onboarding="admin-payments">
      <PageHeader
        title="Payments"
        subtitle={summarySubtitle}
        below={displaySettings}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No tenants yet"
          description="Add tenants to track upcoming rent due dates, countdown, and lease end."
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payments match this filter"
          description="Try clearing Payment Status or Payment Method in Display Settings — or choose another filter."
        />
      ) : effectiveViewMode === 'spreadsheet' ? (
        <PaymentTable
          rows={sortedRows}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          highlightedId={highlightedId}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          arrangeColumns={arrangeColumns}
          onArrangeDone={() => setArrangeColumns(false)}
        />
      ) : (
        <div className="tile-scale-root" style={paymentTileScaleStyle(factor)}>
          <div
            className={cn(
              isMobile
                ? cn(sectionTileGridClassName(mobileTileColumns), 'section-tile-grid--fill')
                : paymentTileGridClassName(scale)
            )}
          >
            {filteredRows.map((row) => {
              const anchorId = paymentTenantAnchorId(row.client.id)
              const paidEarly = row.display === 'Paid Early'
              const shareLabel =
                row.monthlyRent != null ? formatUsd(row.monthlyRent) : null
              const unitRentLabel =
                row.unitMonthlyRent != null ? formatUsd(row.unitMonthlyRent) : null
              const methodLabel = paymentProviderLabel(row.paymentMethod)
              const methodLogo = paymentPartnerLogoByProvider[row.paymentMethod]
              const showMessage = statusFilter === 'overdue' && row.display === 'Overdue'
              const firstName = getFirstName(row.client.name)

              return (
                <Card
                  key={row.client.id}
                  id={anchorId}
                  padding="none"
                  className={cn(
                    'tile-card lease-tile-card payment-tile-card scroll-mt-28',
                    highlightedId === anchorId && 'payment-tile-card--highlight'
                  )}
                >
                  <div className="lease-tile-card__body payment-tile-card__body">
                    {paidEarly && (
                      <span
                        className="payment-tile-card__early-badge"
                        title="Paid before due date"
                      >
                        <Clock aria-hidden strokeWidth={2.25} />
                        Paid Early
                      </span>
                    )}

                    <span
                      className={cn(
                        'payment-tile-card__method-badge',
                        `payment-tile-card__method-badge--${row.paymentMethod}`
                      )}
                      title={`Paid via ${methodLabel}`}
                    >
                      <img
                        src={methodLogo.src}
                        alt={methodLogo.alt}
                        className="payment-tile-card__method-logo"
                        loading="lazy"
                      />
                    </span>

                    <Link
                      to={`/studio/clients/${row.client.id}`}
                      className="payment-tile-card__link"
                    >
                      <div className="lease-tile-card__content">
                        <div className="lease-tile-card__icon" aria-hidden>
                          <DollarSign strokeWidth={1.75} />
                        </div>

                        <p className="tile-card__body font-semibold text-ink">
                          {row.client.name}
                        </p>

                        <h3 className="tile-card__title tile-card__address-static">
                          {row.address}
                        </h3>

                        {row.unitLabel ? (
                          <p className="tile-card__meta">{row.unitLabel}</p>
                        ) : null}

                        {row.display === 'Overdue' ? (
                          <div className="lease-tile-card__status">
                            <OverdueAmountIndicator
                              amount={row.remainingBalance ?? row.overdueAmount}
                              overdueCount={row.overduePaymentCount}
                              className="justify-center [&_span.text-sm]:text-[length:var(--tile-amount)]"
                            />
                          </div>
                        ) : shareLabel ? (
                          <p className="payment-tile-card__amount">{shareLabel}</p>
                        ) : null}

                        <div className="lease-tile-card__status">
                          <StatusBadge
                            type="payment"
                            status={displayBadgeStatus(row.display, row.situation)}
                            label={displayBadgeLabel(row.display, row.statusLabel)}
                          />
                        </div>

                        {(unitRentLabel || shareLabel) && (
                          <p className="tile-card__meta">
                            {unitRentLabel ? `Unit rent ${unitRentLabel}/mo` : null}
                            {unitRentLabel && shareLabel ? ' · ' : null}
                            {shareLabel
                              ? row.unitOccupantCount > 1
                                ? `Your share ${shareLabel}/mo`
                                : unitRentLabel
                                  ? `Responsibility ${shareLabel}/mo`
                                  : `${shareLabel}/mo`
                              : null}
                          </p>
                        )}

                        <p className="tile-card__meta">
                          Paid {formatUsd(row.amountPaid)}
                          {row.remainingBalance != null
                            ? ` · Remaining ${formatUsd(row.remainingBalance)}`
                            : null}
                          {row.leaseLengthMonths != null
                            ? ` · ${formatLeaseLengthLabel(row.leaseLengthMonths)}`
                            : null}
                        </p>
                      </div>

                      <div className="payment-tile-card__details">
                        <TileDateMeta
                          label={
                            row.presentation.lastPaymentOnTime === true
                              ? 'Last payment on time'
                              : row.presentation.lastPaymentOnTime === false
                                ? 'Last payment late'
                                : 'Last payment'
                          }
                          value={
                            row.lastPaymentMadeOn
                              ? formatDate(row.lastPaymentMadeOn)
                              : 'No payment yet'
                          }
                          highlighted={
                            highlightedId === anchorId && highlightedFocus === 'last'
                          }
                        />
                        <TileDateMeta
                          label={
                            row.situation === 'paid_in_full'
                              ? 'Next payment'
                              : row.nextDueDate &&
                                  row.finalDueDate &&
                                  row.nextDueDate === row.finalDueDate
                                ? 'Final payment due'
                                : row.situation === 'overdue' ||
                                    row.situation === 'partially_paid'
                                  ? 'Was due'
                                  : 'Next payment due'
                          }
                          value={
                            row.situation === 'paid_in_full'
                              ? 'All payments complete'
                              : row.nextDueDate
                                ? formatDate(row.nextDueDate)
                                : '—'
                          }
                          highlighted={
                            highlightedId === anchorId && highlightedFocus === 'next'
                          }
                        />
                        <TileDateMeta
                          label={
                            row.situation === 'overdue' ||
                            row.situation === 'partially_paid'
                              ? 'Overdue by'
                              : 'Countdown'
                          }
                          value={
                            row.situation === 'paid_in_full'
                              ? '—'
                              : row.daysUntilNextDue != null
                                ? formatDaysRemainingLabel(row.daysUntilNextDue)
                                : '—'
                          }
                        />
                        <TileDateMeta
                          label="Final due"
                          value={
                            row.outstandingFinalDueDate
                              ? formatDate(row.outstandingFinalDueDate)
                              : row.situation === 'paid_in_full'
                                ? 'Complete'
                                : '—'
                          }
                        />
                        <TileDateMeta
                          label="Lease ends"
                          value={row.leaseEndDate ? formatDate(row.leaseEndDate) : '—'}
                        />
                      </div>
                    </Link>

                    {row.client.rentInvoice?.zelleMarkedPaidAt &&
                    !row.client.rentInvoice?.paidAt ? (
                      <div className="payment-tile-card__message px-3 pb-3">
                        <p className="mb-2 text-[11px] text-ink-muted">
                          Tenant marked Zelle rent as sent
                          {row.client.rentInvoice.zelleMemo
                            ? ` · memo ${row.client.rentInvoice.zelleMemo}`
                            : ''}
                          . Confirm after funds arrive.
                        </p>
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border-2 border-ink bg-surface px-3 text-[10px] font-semibold uppercase tracking-caps shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]"
                          onClick={async () => {
                            try {
                              await confirmClientPayment(row.client.id, 'rent')
                              await refresh()
                              setSentFeedback((prev) => ({
                                ...prev,
                                [row.client.id]: 'Zelle rent confirmed.',
                              }))
                            } catch {
                              setSentFeedback((prev) => ({
                                ...prev,
                                [row.client.id]: 'Could not confirm Zelle rent.',
                              }))
                            }
                          }}
                        >
                          Confirm Zelle rent
                        </button>
                      </div>
                    ) : null}

                    {showMessage && (
                      <div className="payment-tile-card__message">
                        {sentFeedback[row.client.id] && (
                          <p className="mb-2 text-[11px] text-ink-muted">
                            {sentFeedback[row.client.id]}
                          </p>
                        )}
                        <SendTenantMessageSection
                          tenantName={row.client.name}
                          address={row.address}
                          phone={row.client.phone}
                          landlordName={landlordName}
                          onSent={(message) =>
                            handleMessageSent(row.client.id, firstName, message)
                          }
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
