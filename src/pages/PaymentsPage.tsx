import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Clock, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import { PaymentsSectionTabs } from '@/components/payments/PaymentsSectionTabs'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { getRemainingBalanceAmount } from '@/lib/clientUtils'
import {
  formatDaysRemainingLabel,
  formatLeaseLengthLabel,
} from '@/lib/leaseSchedule'
import {
  buildTenantPaymentRows,
  displayBadgeLabel,
  displayBadgeStatus,
  groupPaymentRowsByAddress,
  paymentTenantAnchorId,
} from '@/lib/paymentTenantRows'
import {
  PAYMENT_TILE_SCALE_DEFAULT,
  paymentTileGridClassName,
  paymentTileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import { cn, formatDate } from '@/lib/utils'

/** Bumped so the new 100% default applies for existing sessions. */
const PAYMENTS_TILE_SCALE_KEY = 'payments-tile-scale-v2'

function TileDateMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="payment-tile-card__detail">
      <p className="tile-card__label">{label}</p>
      <p className="tile-card__value">{value}</p>
    </div>
  )
}

export function PaymentsPage() {
  const { clients, contracts } = useApp()
  const location = useLocation()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const { scale, setScale, factor } = useTileScale(
    PAYMENTS_TILE_SCALE_KEY,
    PAYMENT_TILE_SCALE_DEFAULT
  )

  const groups = useMemo(() => {
    const rows = buildTenantPaymentRows(clients, contracts)
    return groupPaymentRowsByAddress(rows)
  }, [clients, contracts])

  const totals = useMemo(() => {
    const rows = groups.flatMap((g) => g.tenants)
    return {
      paid: rows.filter((r) => r.display === 'Paid' || r.display === 'Paid Early').length,
      due: rows.filter((r) => r.display !== 'Paid' && r.display !== 'Paid Early').length,
    }
  }, [groups])

  useEffect(() => {
    if (!location.hash) {
      setHighlightedId(null)
      return
    }
    const targetId = location.hash.slice(1)
    const el = document.getElementById(targetId)
    if (!el) return
    setHighlightedId(targetId)
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    const clearHighlight = window.setTimeout(() => setHighlightedId(null), 2500)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearHighlight)
    }
  }, [location.hash, groups])

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={
          clients.length === 0
            ? 'Rent due dates for every tenant, grouped by address.'
            : `${totals.due} due · ${totals.paid} paid across ${groups.length} ${groups.length === 1 ? 'address' : 'addresses'}.`
        }
        action={
          clients.length > 0 ? (
            <TileScaleControl value={scale} onChange={setScale} label="Payment tile size" />
          ) : undefined
        }
      />

      <PaymentsSectionTabs />

      {clients.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No tenants yet"
          description="Add tenants to track upcoming rent due dates, countdown, and lease end by property address."
        />
      ) : (
        <div className="tile-scale-root space-y-6" style={paymentTileScaleStyle(factor)}>
          {groups.map(({ address, tenants }) => (
            <section key={address}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink sm:text-base">{address}</h2>
                  <p className="text-xs text-ink-muted">
                    {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                  </p>
                </div>
              </div>

              <div className={paymentTileGridClassName(scale)}>
                {tenants.map((row) => {
                  const remaining = getRemainingBalanceAmount(row.contract)
                  const anchorId = paymentTenantAnchorId(row.client.id)
                  const paidEarly = row.earlyPayment != null
                  const amountLabel =
                    row.display === 'Overdue' && row.overdueAmount != null
                      ? null
                      : row.monthlyRent != null
                        ? `$${row.monthlyRent.toLocaleString()}`
                        : remaining != null
                          ? `$${remaining.toLocaleString()}`
                          : null

                  return (
                    <Card
                      key={row.client.id}
                      id={anchorId}
                      padding="none"
                      className={cn(
                        'tile-card payment-tile-card scroll-mt-28 transition-colors',
                        paidEarly && 'payment-tile-card--has-early',
                        highlightedId === anchorId && 'bg-accent-light/60 ring-2 ring-accent'
                      )}
                    >
                      <div className="payment-tile-card__body">
                        {paidEarly && (
                          <span className="payment-tile-card__early-badge" title="Paid before due date">
                            <Clock aria-hidden strokeWidth={2.25} />
                            Paid Early
                          </span>
                        )}

                        <Link
                          to={`/studio/clients/${row.client.id}`}
                          className="payment-tile-card__link"
                        >
                          <div className="payment-tile-card__content">
                            <div className="payment-tile-card__icon" aria-hidden>
                              <DollarSign strokeWidth={1.75} />
                            </div>

                            <p className="tile-card__body font-semibold text-ink">
                              {row.client.name}
                            </p>

                            <h3 className="tile-card__title tile-card__address-static">
                              {row.address}
                            </h3>

                            {row.display === 'Overdue' ? (
                              <div className="payment-tile-card__status">
                                <OverdueAmountIndicator
                                  amount={row.overdueAmount}
                                  overdueCount={row.overduePaymentCount}
                                  className="justify-center [&_span.text-sm]:text-[length:var(--tile-amount)]"
                                />
                              </div>
                            ) : amountLabel ? (
                              <p className="payment-tile-card__amount">{amountLabel}</p>
                            ) : null}

                            <div className="payment-tile-card__status">
                              <StatusBadge
                                type="payment"
                                status={displayBadgeStatus(row.display)}
                                label={displayBadgeLabel(row.display)}
                              />
                            </div>

                            {row.leaseLengthMonths != null && (
                              <p className="tile-card__meta">
                                {formatLeaseLengthLabel(row.leaseLengthMonths)}
                                {row.display !== 'Overdue' &&
                                  remaining != null &&
                                  row.display !== 'Paid' &&
                                  row.display !== 'Paid Early' && (
                                    <> · ${remaining.toLocaleString()} remaining</>
                                  )}
                              </p>
                            )}
                          </div>

                          <div className="payment-tile-card__details">
                            <TileDateMeta
                              label="Next due"
                              value={row.nextDueDate ? formatDate(row.nextDueDate) : '—'}
                            />
                            <TileDateMeta
                              label="Countdown"
                              value={
                                row.daysUntilNextDue != null
                                  ? formatDaysRemainingLabel(row.daysUntilNextDue)
                                  : '—'
                              }
                            />
                            <TileDateMeta
                              label="Final due"
                              value={row.finalDueDate ? formatDate(row.finalDueDate) : '—'}
                            />
                            <TileDateMeta
                              label="Lease ends"
                              value={row.leaseEndDate ? formatDate(row.leaseEndDate) : '—'}
                            />
                          </div>
                        </Link>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
