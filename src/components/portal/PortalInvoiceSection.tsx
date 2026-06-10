import { CheckCircle, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { trackPaymentLinkClick } from '@/lib/portalApi'
import { portalPayButtonLabel } from '@/lib/paymentProvider'
import { formatDate } from '@/lib/utils'
import type { PortalInvoice } from '@/types'

interface PortalInvoiceSectionProps {
  invoice: PortalInvoice | null | undefined
  title?: string
}

export function PortalInvoiceSection({
  invoice,
  title = 'Invoice',
}: PortalInvoiceSectionProps) {
  if (!invoice) return null

  if (invoice.paidAt) {
    return (
      <section className="mb-8">
        <h2 className="label-caps mb-3 flex items-center gap-2 text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          Payment
        </h2>
        <Card padding="md" className="border-emerald-200 bg-emerald-50">
          <p className="font-semibold text-emerald-900">
            {invoice.invoiceType === 'final' ? 'Final balance received' : 'Down payment received'}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            ${invoice.amount.toFixed(2)} {invoice.currency} paid on{' '}
            {formatDate(invoice.paidAt)}
          </p>
        </Card>
      </section>
    )
  }

  if (!invoice.paymentLink) return null

  return (
    <section className="mb-8">
        <h2 className="label-caps mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4" />
        {title}
      </h2>
      <Card padding="lg" className="border-accent">
        <p className="font-semibold text-ink">
          {invoice.invoiceType === 'final' ? 'Final balance due' : 'Down payment due'}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{invoice.description}</p>
        <p className="mt-3 text-2xl font-bold text-ink">
          ${invoice.amount.toFixed(2)}{' '}
          <span className="text-sm font-medium text-ink-muted">{invoice.currency}</span>
        </p>
        {invoice.sentToPortalAt && (
          <p className="mt-2 text-xs text-ink-faint">
            Issued {formatDate(invoice.sentToPortalAt)}
          </p>
        )}
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await trackPaymentLinkClick()
            } catch {
              /* still open checkout if tracking fails */
            }
            window.open(invoice.paymentLink, '_blank', 'noopener,noreferrer')
          }}
        >
          <CreditCard className="h-4 w-4" />
          {portalPayButtonLabel(invoice.paymentProvider)}
        </Button>
        <p className="mt-3 text-xs text-ink-muted">
          You&apos;ll return here automatically after payment. Your designer will be notified.
        </p>
      </Card>
    </section>
  )
}
