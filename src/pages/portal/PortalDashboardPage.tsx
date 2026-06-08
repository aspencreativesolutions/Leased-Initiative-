import { AlertTriangle, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ClientStatusOverview } from '@/components/clients/ClientStatusOverview'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { PortalCurrentContracts } from '@/components/portal/PortalCurrentContracts'
import { PortalInvoiceSection } from '@/components/portal/PortalInvoiceSection'
import { PortalProjectFilesSection } from '@/components/portal/PortalProjectFilesSection'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { formatDate } from '@/lib/utils'

export function PortalDashboardPage() {
  const { data, loading, error } = usePortalDashboard()

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
      <div>
        <PageHeader title="Welcome" subtitle="Client Portal" />
        <div className="mt-6">
          <PortalCurrentContracts
            contracts={[]}
            emptyDescription="Your designer will accept your registration and send a contract here when it's ready."
          />
          <p className="mt-4 text-sm text-ink-muted">{data.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${data.client?.name ?? 'there'}`}
        subtitle={data.client?.businessName}
      />

      {data.projectStarted && (
        <Card padding="md" className="mb-6 border-brand bg-brand/5">
          <div className="flex gap-3">
            <Rocket className="h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="font-semibold text-ink">Your project is active</p>
              <p className="mt-1 text-sm text-ink-muted">
                Started {data.projectStartedAt ? formatDate(data.projectStartedAt) : 'recently'}.
                Upload files below and track your status here.
              </p>
            </div>
          </div>
        </Card>
      )}

      {data.client && data.projectStarted ? (
        <ClientStatusOverview
          className="mb-6"
          projectStatus={data.client.projectStatus}
          contractStatus={data.client.contractStatus}
          paymentStatus={data.client.paymentStatus}
        />
      ) : data.client ? (
        <Card padding="md" className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                Project
              </p>
              <StatusBadge type="project" status={data.client.projectStatus} />
            </div>
            {data.client.portalContractStatus && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Contract
                </p>
                <PortalContractStatusBadge status={data.client.portalContractStatus} />
              </div>
            )}
            {data.client.paymentStatus && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                  Payment
                </p>
                <StatusBadge type="payment" status={data.client.paymentStatus} />
              </div>
            )}
          </div>
        </Card>
      ) : null}

      <div className="mb-8">
        <PortalCurrentContracts contracts={data.contracts} />
      </div>

      <PortalInvoiceSection invoice={data.invoice} title="Deposit Invoice" />
      <PortalInvoiceSection invoice={data.finalInvoice} title="Final Invoice" />

      <PortalProjectFilesSection
        projectName={data.client?.projectName ?? 'your project'}
        enabled={data.projectStarted}
        projectStarted={data.projectStarted}
        supportContact={data.supportContact}
      />
    </div>
  )
}
