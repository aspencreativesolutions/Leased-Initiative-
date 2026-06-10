import { CalendarClock, Receipt } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { PortalInvoice } from '@/types'

interface PortalRemainingBalanceSectionProps {
  balance: PortalInvoice
}

export function PortalRemainingBalanceSection({
  balance,
}: PortalRemainingBalanceSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="label-caps mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4" />
        Remaining Balance
      </h2>
      <Card padding="lg" className="border-line bg-surface/50">
        <p className="font-semibold text-ink">Final project payment</p>
        <p className="mt-1 text-sm text-ink-muted">{balance.description}</p>
        <p className="mt-3 text-2xl font-bold text-ink">
          ${balance.amount.toFixed(2)}{' '}
          <span className="text-sm font-medium text-ink-muted">{balance.currency}</span>
        </p>
        {balance.dueDate && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Due upon project completion
            {balance.dueDate ? ` — expected by ${formatDate(balance.dueDate)}` : ''}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Your down payment is complete. Your designer will send a final invoice when
          deliverables are ready.
        </p>
      </Card>
    </section>
  )
}
