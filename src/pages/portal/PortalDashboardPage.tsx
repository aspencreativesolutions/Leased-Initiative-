import { useState } from 'react'
import { AlertTriangle, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortalCurrentContracts } from '@/components/portal/PortalCurrentContracts'
import { PortalInvoiceSection } from '@/components/portal/PortalInvoiceSection'
import { PortalPayRentSection } from '@/components/portal/PortalPayRentSection'
import { PortalProblemReportModal } from '@/components/portal/PortalProblemReportModal'
import { PortalProjectFilesSection } from '@/components/portal/PortalProjectFilesSection'
import { PortalRemainingBalanceSection } from '@/components/portal/PortalRemainingBalanceSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { formatDate } from '@/lib/utils'

export function PortalDashboardPage() {
  const { data, loading, error, refresh } = usePortalDashboard()
  const [reportOpen, setReportOpen] = useState(false)

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">Loading your dashboard…</div>
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description={error}
      />
    )
  }

  if (!data.linked) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <PageHeader title="Welcome" subtitle="Tenant Portal" />
        <div className="mt-6">
          <PortalCurrentContracts
            contracts={[]}
            emptyDescription="Your landlord will approve your registration and send a lease here when it's ready."
          />
          <p className="mt-4 text-sm text-ink-muted">{data.message}</p>
        </div>
      </div>
    )
  }

  const leaseActiveTag = data.projectStarted ? (
    <div className="flex w-full flex-col items-center gap-2 sm:items-end">
      <div className="inline-flex max-w-[11rem] items-center gap-2 rounded-sm border border-brand/40 bg-brand/5 px-2.5 py-1.5 sm:max-w-none">
        <Rocket className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-caps text-brand">
            Lease active
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            Since{' '}
            {data.projectStartedAt ? formatDate(data.projectStartedAt) : 'recently'}
          </p>
        </div>
      </div>
      <button
        type="button"
        data-onboarding="portal-report-problem"
        onClick={() => setReportOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-surface-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-caps text-ink transition-colors hover:bg-surface"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Report Issue
      </button>
    </div>
  ) : (
    <div className="flex w-full justify-center sm:justify-end">
      <button
        type="button"
        data-onboarding="portal-report-problem"
        onClick={() => setReportOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-surface-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-caps text-ink transition-colors hover:bg-surface"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Report Issue
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Hello, ${data.client?.name ?? 'there'}`}
        subtitle={data.client?.businessName}
        tag={leaseActiveTag}
      />

      {data.rentPayment ? (
        <PortalPayRentSection
          rentPayment={data.rentPayment}
          onInvoiceCreated={() => {
            void refresh()
          }}
        />
      ) : (
        <section className="mx-auto max-w-lg px-2 py-10 text-center sm:py-14">
          <p className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Your next payment date will appear once your lease is active.
          </p>
        </section>
      )}

      <div className="mb-8 text-center">
        <PortalCurrentContracts
          contracts={data.contracts}
          contractStatus={data.client?.contractStatus}
          projectStarted={data.projectStarted}
        />
      </div>

      <div className="mx-auto max-w-lg">
        <PortalInvoiceSection invoice={data.invoice} title="Deposit Invoice" />
        {data.remainingBalance && (
          <PortalRemainingBalanceSection balance={data.remainingBalance} />
        )}
        <PortalInvoiceSection invoice={data.finalInvoice} title="Final Invoice" />
      </div>

      <div className="mx-auto mt-2 max-w-lg">
        <PortalProjectFilesSection
          className="mt-0"
          projectName={data.client?.projectName ?? 'your lease'}
          enabled={Boolean(data.projectStarted)}
          projectStarted={Boolean(data.projectStarted)}
          supportContact={data.supportContact}
        />
      </div>

      <PortalProblemReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false)
          void refresh()
        }}
      />
    </div>
  )
}
