import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import { PaymentsSectionTabs } from '@/components/payments/PaymentsSectionTabs'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TileScaleControl } from '@/components/ui/TileScaleControl'
import { useApp } from '@/context/AppContext'
import { TenantMarkerBadge } from '@/components/clients/TenantMarkerBadge'
import { clientNameMarkersClass } from '@/components/clients/clientBadgeStyles'
import { getFirstName, getRemainingBalanceAmount } from '@/lib/clientUtils'
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
  tileGridClassName,
  tileScaleStyle,
  useTileScale,
} from '@/lib/tileScale'
import { cn, formatDate } from '@/lib/utils'

const PAYMENTS_TILE_SCALE_KEY = 'payments-tile-scale'

function TileDateMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="tile-card__label">{label}</p>
      <p className="tile-card__value truncate">{value}</p>
    </div>
  )
}

export function PaymentsPage() {
  const { clients, contracts } = useApp()
  const location = useLocation()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const { scale, setScale, factor } = useTileScale(PAYMENTS_TILE_SCALE_KEY)

  const groups = useMemo(() => {
    const rows = buildTenantPaymentRows(clients, contracts)
    return groupPaymentRowsByAddress(rows)
  }, [clients, contracts])

  const totals = useMemo(() => {
    const rows = groups.flatMap((g) => g.tenants)
    return {
      paid: rows.filter((r) => r.display === 'Paid').length,
      due: rows.filter((r) => r.display !== 'Paid').length,
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
        <div className="tile-scale-root space-y-5" style={tileScaleStyle(factor)}>
          {groups.map(({ address, tenants }) => (
            <section key={address}>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-ink sm:text-base">
                    {address}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                  </p>
                </div>
              </div>

              <div className={tileGridClassName(scale)}>
                {tenants.map((row) => {
                  const remaining = getRemainingBalanceAmount(row.contract)
                  const anchorId = paymentTenantAnchorId(row.client.id)
                  return (
                    <Card
                      key={row.client.id}
                      id={anchorId}
                      padding="none"
                      className={cn(
                        'tile-card scroll-mt-28 transition-colors',
                        highlightedId === anchorId && 'bg-accent-light/60 ring-2 ring-accent'
                      )}
                    >
                      <Link
                        to={`/studio/clients/${row.client.id}`}
                        className="flex min-h-0 flex-1 flex-col gap-[calc(0.35rem*var(--tile-scale))] outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={clientNameMarkersClass}>
                              <p
                                className="tile-card__title min-w-0 truncate"
                                title={
                                  row.client.name !== getFirstName(row.client.name)
                                    ? row.client.name
                                    : undefined
                                }
                              >
                                {getFirstName(row.client.name)}
                              </p>
                              <TenantMarkerBadge />
                            </div>
                            <p className="tile-card__body mt-0.5 truncate">
                              {row.client.businessName || row.client.email}
                            </p>
                          </div>
                          <StatusBadge
                            type="payment"
                            status={displayBadgeStatus(row.display)}
                            label={displayBadgeLabel(row.display)}
                            className="shrink-0"
                          />
                        </div>

                        {row.leaseLengthMonths != null && (
                          <p className="tile-card__meta">
                            {formatLeaseLengthLabel(row.leaseLengthMonths)}
                            {row.display !== 'Overdue' &&
                              remaining != null &&
                              row.display !== 'Paid' && (
                                <> · ${remaining.toLocaleString()} remaining</>
                              )}
                          </p>
                        )}

                        {row.display === 'Overdue' && (
                          <OverdueAmountIndicator
                            amount={row.overdueAmount}
                            overdueCount={row.overduePaymentCount}
                            className="mt-0.5 [&_span.text-sm]:text-[length:var(--tile-body)]"
                          />
                        )}

                        <div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
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
