import { AlertTriangle, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClientStatusOverview } from '@/components/clients/ClientStatusOverview'
import { PortalCurrentContracts } from '@/components/portal/PortalCurrentContracts'
import { PortalInvoiceSection } from '@/components/portal/PortalInvoiceSection'
import { PortalRemainingBalanceSection } from '@/components/portal/PortalRemainingBalanceSection'
import { PortalProjectFilesSection } from '@/components/portal/PortalProjectFilesSection'
import { ProjectWorkspaceRow } from '@/components/project/ProjectWorkspaceRow'
import { DEFAULT_SERVICE_TIER } from '@/lib/serviceTiers'
import { normalizeCompletedChecklistItems } from '@/lib/projectChecklist'
import { togglePortalChecklistItem } from '@/lib/projectChecklistApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { formatDate } from '@/lib/utils'

export function PortalDashboardPage() {
  const { data, loading, error, refresh } = usePortalDashboard()

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

  const serviceTier = data.client?.serviceTier ?? DEFAULT_SERVICE_TIER
  const completedItemIds = normalizeCompletedChecklistItems(
    data.client?.projectChecklistCompleted,
    serviceTier
  )

  const handleChecklistToggle = async (itemId: string, completed: boolean) => {
    await togglePortalChecklistItem(itemId, completed)
    await refresh()
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${data.client?.name ?? 'there'}`}
        subtitle={data.client?.businessName}
        tag={
          data.projectStarted ? (
            <div className="ml-auto inline-flex max-w-[11rem] items-center gap-2 rounded-sm border border-brand/40 bg-brand/5 px-2.5 py-1.5 sm:ml-0 sm:max-w-none">
              <Rocket className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-caps text-brand">
                  Project active
                </p>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Since{' '}
                  {data.projectStartedAt ? formatDate(data.projectStartedAt) : 'recently'}
                </p>
              </div>
            </div>
          ) : undefined
        }
      />

      {data.client && (
        <div data-onboarding="portal-status">
          <ClientStatusOverview
            className="mb-6"
            mode="portal"
            projectStatus={data.client.projectStatus}
            contractStatus={data.client.contractStatus}
            paymentStatus={data.client.paymentStatus}
            remainingBalance={data.remainingBalance}
            projectStarted={data.projectStarted}
            showProgress={false}
          />
        </div>
      )}

      {data.projectStarted && (
        <ProjectWorkspaceRow
          className="mb-8 mt-0"
          variant="portal"
          serviceTier={serviceTier}
          completedItemIds={completedItemIds}
          onChecklistToggle={handleChecklistToggle}
          files={
            <PortalProjectFilesSection
              className="mt-0"
              projectName={data.client?.projectName ?? 'your project'}
              enabled
              projectStarted
              supportContact={data.supportContact}
            />
          }
        />
      )}

      <div className="mb-8">
        <PortalCurrentContracts
          contracts={data.contracts}
          contractStatus={data.client?.contractStatus}
          projectStarted={data.projectStarted}
        />
      </div>

      <PortalInvoiceSection invoice={data.invoice} title="Deposit Invoice" />
      {data.remainingBalance && (
        <PortalRemainingBalanceSection balance={data.remainingBalance} />
      )}
      <PortalInvoiceSection invoice={data.finalInvoice} title="Final Invoice" />

      {!data.projectStarted && (
        <ProjectWorkspaceRow
          variant="portal"
          serviceTier={serviceTier}
          completedItemIds={completedItemIds}
          onChecklistToggle={handleChecklistToggle}
          files={
            <PortalProjectFilesSection
              className="mt-0"
              projectName={data.client?.projectName ?? 'your project'}
              enabled={false}
              projectStarted={false}
              supportContact={data.supportContact}
            />
          }
        />
      )}
    </div>
  )
}
