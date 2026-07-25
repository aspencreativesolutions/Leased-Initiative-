import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Clock, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import { SendTenantMessageSection } from '@/components/payments/SendTenantMessageSection'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { getFirstName, shouldShowInOfficialTenants } from '@/lib/clientUtils'
import {
  formatDaysRemainingLabel,
  formatLeaseLengthLabel,
} from '@/lib/leaseSchedule'
import { paymentPartnerLogoByProvider } from '@/lib/paymentPartnerLogos'
import { paymentProviderLabel } from '@/lib/paymentProvider'
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
import { cn, formatDate } from '@/lib/utils'
import { resolveLandlordSenderName } from '@/lib/publicDemo'
import type { PaymentProvider } from '@/types'

/** Bumped so the new 100% default applies for existing sessions. */
const PAYMENTS_TILE_SCALE_KEY = 'payments-tile-scale-v2'

const PAYMENT_METHOD_OPTIONS: PaymentProvider[] = ['stripe', 'paypal', 'square']

type StatusFilter = 'overdue' | 'paid_early'

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

/** Stable pseudo-random method so tiles don’t shuffle on re-render. */
function paymentMethodForClient(clientId: string): PaymentProvider {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0
  }
  return PAYMENT_METHOD_OPTIONS[hash % PAYMENT_METHOD_OPTIONS.length]
}

type PaymentRowWithMethod = TenantPaymentRow & { paymentMethod: PaymentProvider }

export function PaymentsPage() {
  const { clients, contracts, properties, settings, addNote } = useApp()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [highlightedFocus, setHighlightedFocus] = useState<'last' | 'next' | 'remind' | null>(
    null
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(() => {
    const q = searchParams.get('status')
    return q === 'overdue' || q === 'paid_early' ? q : null
  })
  const [methodFilterOpen, setMethodFilterOpen] = useState(false)
  const [methodFilter, setMethodFilter] = useState<PaymentProvider | ''>('')
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({})
  const { scale, setScale, factor } = useTileScale(
    PAYMENTS_TILE_SCALE_KEY,
    PAYMENT_TILE_SCALE_DEFAULT
  )

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
      paymentMethod: paymentMethodForClient(row.client.id),
    }))
  }, [clients, contracts, properties])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === 'overdue' && row.display !== 'Overdue') return false
      if (statusFilter === 'paid_early' && row.display !== 'Paid Early') return false
      if (methodFilter && row.paymentMethod !== methodFilter) return false
      return true
    })
  }, [rows, statusFilter, methodFilter])

  const totals = useMemo(() => summarizePaymentRows(rows), [rows])

  const summarySubtitle =
    clients.length === 0
      ? 'Rent due dates and status for every tenant.'
      : totals.overdueCount > 0
        ? `${totals.overdueCount} overdue · ${formatUsd(totals.overdueTotal)} past due · ${totals.paid} current · ${rows.length} ${rows.length === 1 ? 'tenant' : 'tenants'}.`
        : `${totals.due} due · ${totals.paid} current across ${rows.length} ${rows.length === 1 ? 'tenant' : 'tenants'}.`

  const landlordName = resolveLandlordSenderName(settings)
  const filtersActive = statusFilter != null || methodFilter !== ''

  useEffect(() => {
    const q = searchParams.get('status')
    if (q === 'overdue' || q === 'paid_early') {
      setStatusFilter(q)
    } else {
      setStatusFilter(null)
    }
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

  function selectStatusFilter(next: StatusFilter) {
    const value = statusFilter === next ? null : next
    setStatusFilter(value)
    setSearchParams(
      (params) => {
        const nextParams = new URLSearchParams(params)
        if (value) nextParams.set('status', value)
        else nextParams.delete('status')
        return nextParams
      },
      { replace: true }
    )
  }

  function toggleMethodFilter() {
    setMethodFilterOpen((open) => {
      if (open) setMethodFilter('')
      return !open
    })
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
      <Card className="w-fit max-w-full !px-3 !py-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Display Settings
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <TileScaleControl
              variant="row"
              value={scale}
              onChange={setScale}
              label="Payment tile size"
              className="min-w-[12.5rem] flex-none"
            />

            <button
              type="button"
              onClick={() => selectStatusFilter('overdue')}
              aria-pressed={statusFilter === 'overdue'}
              data-onboarding="admin-overdue-rent"
              className={cn(
                filterButtonClass,
                statusFilter === 'overdue'
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              Overdue Rent
            </button>

            <button
              type="button"
              onClick={() => selectStatusFilter('paid_early')}
              aria-pressed={statusFilter === 'paid_early'}
              className={cn(
                filterButtonClass,
                statusFilter === 'paid_early'
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              Paid Early
            </button>

            <button
              type="button"
              onClick={toggleMethodFilter}
              aria-pressed={methodFilterOpen}
              className={cn(
                filterButtonClass,
                methodFilterOpen
                  ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                  : 'border-ink bg-surface-paper text-ink hover:border-brand/50'
              )}
            >
              Payment Method
            </button>

            {methodFilterOpen && (
              <Select
                label=""
                aria-label="Payment method"
                value={methodFilter}
                onChange={(e) =>
                  setMethodFilter((e.target.value as PaymentProvider | '') || '')
                }
                className="w-[9.5rem] shrink-0 [&_select]:h-9 [&_select]:py-0"
              >
                <option value="">All</option>
                {PAYMENT_METHOD_OPTIONS.map((provider) => (
                  <option key={provider} value={provider}>
                    {paymentProviderLabel(provider)}
                  </option>
                ))}
              </Select>
            )}
          </div>

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
          description="Try clearing Overdue Rent, Paid Early, or Payment Method — or choose another method."
        />
      ) : (
        <div className="tile-scale-root" style={paymentTileScaleStyle(factor)}>
          <div className={paymentTileGridClassName(scale)}>
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
