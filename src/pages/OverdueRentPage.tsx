import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { OverdueAmountIndicator } from '@/components/payments/OverdueAmountIndicator'
import { PaymentsSectionTabs } from '@/components/payments/PaymentsSectionTabs'
import { SendTenantMessageSection } from '@/components/payments/SendTenantMessageSection'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useApp } from '@/context/AppContext'
import { TenantMarkerBadge } from '@/components/clients/TenantMarkerBadge'
import { clientNameMarkersClass } from '@/components/clients/clientBadgeStyles'
import { getFirstName } from '@/lib/clientUtils'
import {
  buildTenantPaymentRows,
  getOverduePaymentRows,
  paymentTenantHref,
} from '@/lib/paymentTenantRows'
import { formatDate } from '@/lib/utils'

function daysOverdueLabel(daysUntilNextDue: number | null): string {
  if (daysUntilNextDue == null) return '—'
  const days = Math.abs(Math.min(daysUntilNextDue, 0))
  if (daysUntilNextDue >= 0) return 'Due today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function landlordDisplayName(settings: {
  ownerName?: string
  businessName?: string
}): string {
  const owner = settings.ownerName?.trim()
  if (owner && owner !== 'Your Name') return owner
  return settings.businessName?.trim() || 'Your landlord'
}

export function OverdueRentPage() {
  const { clients, contracts, settings, addNote } = useApp()
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({})

  const overdueRows = useMemo(() => {
    return getOverduePaymentRows(buildTenantPaymentRows(clients, contracts))
  }, [clients, contracts])

  const landlordName = landlordDisplayName(settings)

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

  return (
    <>
      <PageHeader
        title="Overdue Rent"
        subtitle={
          clients.length === 0
            ? 'Tenants with past-due rent appear here.'
            : overdueRows.length === 0
              ? 'No past-due rent right now.'
              : `${overdueRows.length} ${overdueRows.length === 1 ? 'tenant has' : 'tenants have'} past-due rent — send a message from each row.`
        }
      />

      <PaymentsSectionTabs />

      {clients.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No tenants yet"
          description="Once tenants have overdue payments, they will be listed here with quick links to Payments."
        />
      ) : overdueRows.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="All caught up"
          description="No tenants currently have overdue rent. Check the Payments tab for upcoming due dates."
        />
      ) : (
        <Card padding="none" className="overflow-hidden" data-onboarding="admin-overdue-rent">
          <div className="hidden border-b border-line bg-surface px-4 py-2.5 text-[10px] font-semibold uppercase tracking-caps text-ink-faint sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_7.5rem_6.5rem_7.5rem_minmax(8rem,1fr)] sm:gap-3 sm:px-5">
            <span>Name</span>
            <span>Property address</span>
            <span className="text-right">Overdue amount</span>
            <span className="text-right">Days overdue</span>
            <span className="text-right">Original due date</span>
            <span className="text-right">Actions</span>
          </div>

          <ul className="divide-y divide-line">
            {overdueRows.map((row) => {
              const firstName = getFirstName(row.client.name)
              return (
                <li key={row.client.id}>
                  <div className="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_7.5rem_6.5rem_7.5rem_minmax(8rem,1fr)] sm:items-center sm:gap-3 sm:px-5 sm:py-3.5">
                    <div className="min-w-0">
                      <div className={clientNameMarkersClass}>
                        <p
                          className="min-w-0 truncate text-sm font-semibold text-ink"
                          title={
                            row.client.name !== firstName ? row.client.name : undefined
                          }
                        >
                          {firstName}
                        </p>
                        <TenantMarkerBadge />
                      </div>
                      <p className="truncate text-xs text-ink-muted sm:hidden">{row.address}</p>
                      <div className="mt-1.5 sm:hidden">
                        <StatusBadge type="payment" status="Overdue" label="Overdue" />
                      </div>
                    </div>

                    <p className="hidden min-w-0 truncate text-sm text-ink sm:block">
                      {row.address}
                    </p>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint sm:hidden">
                        Overdue amount
                      </span>
                      <OverdueAmountIndicator
                        amount={row.overdueAmount}
                        overdueCount={row.overduePaymentCount}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint sm:hidden">
                        Days overdue
                      </span>
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        {daysOverdueLabel(row.daysUntilNextDue)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint sm:hidden">
                        Original due date
                      </span>
                      <p className="text-sm font-medium tabular-nums text-ink">
                        {row.nextDueDate ? formatDate(row.nextDueDate) : '—'}
                      </p>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      <Link
                        to={paymentTenantHref(row.client.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-surface sm:justify-end"
                      >
                        View in Payments
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </Link>
                      {sentFeedback[row.client.id] && (
                        <p className="text-right text-[11px] text-ink-muted">
                          {sentFeedback[row.client.id]}
                        </p>
                      )}
                    </div>
                  </div>

                  <SendTenantMessageSection
                    tenantName={row.client.name}
                    address={row.address}
                    phone={row.client.phone}
                    landlordName={landlordName}
                    onSent={(message) =>
                      handleMessageSent(row.client.id, firstName, message)
                    }
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
