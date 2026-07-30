import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, Rocket } from 'lucide-react'
import { PortalApplicationPanel } from '@/components/portal/PortalApplicationPanel'
import { PortalCurrentContracts } from '@/components/portal/PortalCurrentContracts'
import { PortalInvoiceSection } from '@/components/portal/PortalInvoiceSection'
import { PortalPayRentSection } from '@/components/portal/PortalPayRentSection'
import { PortalPaymentScheduleTimeline } from '@/components/portal/PortalPaymentScheduleTimeline'
import { PortalProjectFilesSection } from '@/components/portal/PortalProjectFilesSection'
import { PortalPropertyDetailsPanel } from '@/components/portal/PortalPropertyDetailsPanel'
import { PortalRemainingBalanceSection } from '@/components/portal/PortalRemainingBalanceSection'
import { PortalTimelineView } from '@/components/portal/PortalTimelineView'
import { LoadingWithRefresh } from '@/components/ui/LoadingWithRefresh'
import { useAuth } from '@/context/AuthContext'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import { usePortalTimeline } from '@/hooks/usePortalTimeline'
import { DEMO_AVA_EMAIL, isPublicDemoSession } from '@/lib/publicDemo'
import { cn, formatDate } from '@/lib/utils'

const portalActionBtnClass =
  'group inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-ink bg-surface-paper px-3 py-2 text-xs font-semibold uppercase tracking-caps text-ink transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand hover:bg-brand/5 hover:shadow-[0_4px_12px_-4px_rgb(0_0_0_/_0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:translate-y-0 sm:flex-none sm:min-w-[9.5rem]'

function TenantPortalHeading() {
  return (
    <div className="mb-5 border-b-[length:var(--border-width)] border-ink pb-3 text-center">
      <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl">Tenant Portal</h1>
    </div>
  )
}

export function PortalDashboardPage() {
  const { data, loading, error, refresh, retry, setData } = usePortalDashboard()
  const {
    linked: timelineLinked,
    projectName: timelineProjectName,
    steps: timelineSteps,
    loading: timelineLoading,
  } = usePortalTimeline()
  const { user } = useAuth()
  const showAvaStageNote =
    isPublicDemoSession() &&
    user?.email?.trim().toLowerCase() === DEMO_AVA_EMAIL &&
    data &&
    !data.linked &&
    !data.applicationSubmitted

  // Never dump tenants on a hard error — keep loading, offer refresh after 5s.
  if (loading || error || !data) {
    return (
      <LoadingWithRefresh
        message="Loading your dashboard…"
        onRefresh={() => {
          void retry()
        }}
      />
    )
  }

  if (!data.linked) {
    return (
      <div className="w-full min-w-0">
        <TenantPortalHeading />
        {showAvaStageNote ? (
          <p className="mb-3 rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-3 py-2 text-center text-sm text-ink">
            <span className="font-semibold text-brand">Start Application Sequence (Demo)</span>—
            pick a landlord company, choose an address, select preferences, and send application.
          </p>
        ) : null}
        <PortalApplicationPanel
          data={data}
          onUpdated={(next) => {
            setData(next)
          }}
        />
        <div className="mt-8">
          <PortalCurrentContracts
            contracts={[]}
            emptyDescription={
              data.applicationSubmitted
                ? 'Once accepted, lease agreement and payment timeline will appear here.'
                : 'After you send an application and your landlord accepts you, lease agreement and payment timeline will appear here.'
            }
          />
        </div>
      </div>
    )
  }

  const primaryContractId = data.contracts[0]?.id
  const leaseHref = primaryContractId
    ? `/portal/contracts/${primaryContractId}`
    : undefined

  const leaseActiveTag = (
    <div className="mb-4 flex w-full flex-row flex-wrap items-stretch justify-center gap-2">
      {leaseHref ? (
        <Link
          to={leaseHref}
          className={portalActionBtnClass}
          aria-label="View your active lease"
        >
          <Rocket
            className="h-3.5 w-3.5 shrink-0 text-brand transition-transform duration-200 group-hover:scale-110"
            aria-hidden
          />
          <span className="min-w-0 leading-tight text-left">
            <span className="block font-bold text-brand">Lease Active</span>
            {data.projectStarted && (
              <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-ink-muted">
                Since{' '}
                {data.projectStartedAt ? formatDate(data.projectStartedAt) : 'recently'}
              </span>
            )}
          </span>
        </Link>
      ) : (
        <span
          className={cn(
            portalActionBtnClass,
            'cursor-default opacity-60 hover:translate-y-0 hover:border-ink hover:bg-surface-paper hover:shadow-none'
          )}
          aria-disabled="true"
        >
          <Rocket className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
          <span className="font-bold text-ink-muted">Lease Active</span>
        </span>
      )}
      <Link
        to="/portal/report"
        data-onboarding="portal-report-problem"
        className={portalActionBtnClass}
        aria-label="Request maintenance"
      >
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
          aria-hidden
        />
        Request Maintenance
      </Link>
      <Link
        to="/portal/inspection"
        data-onboarding="portal-condition-report"
        className={portalActionBtnClass}
        aria-label="Condition report inspection checklist"
      >
        <ClipboardCheck
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
          aria-hidden
        />
        Condition Report
      </Link>
    </div>
  )

  const tenantName = data.client?.name?.trim() || 'there'
  const address = data.client?.address?.trim()
  const leaseScheduleReady = Boolean(data.leaseSchedule?.payments?.length)
  const rentReady = Boolean(data.rentPayment)
  const pendingCondition = (data.conditionReports ?? []).find(
    (r) =>
      r.required &&
      (r.status === 'pending' || r.status === 'changes_requested')
  )

  return (
    <div className="w-full min-w-0">
      <TenantPortalHeading />
      {leaseActiveTag}

      {pendingCondition ? (
        <div
          className="mb-4 rounded-sm border-2 border-brand/40 bg-brand/5 px-3 py-3 text-sm text-ink"
          role="status"
        >
          <p className="font-semibold">
            {pendingCondition.kind === 'move_in' ? 'Move-in' : 'Move-out'} condition report{' '}
            {pendingCondition.status === 'changes_requested'
              ? 'needs updates'
              : 'required'}
          </p>
          <p className="mt-1 text-ink-muted">
            Complete your inspection checklist
            {pendingCondition.dueDate ? ` by ${pendingCondition.dueDate}` : ''} so your
            landlord can review the property’s condition.
          </p>
          <Link
            to={`/portal/inspection?id=${encodeURIComponent(pendingCondition.id)}`}
            className="mt-2 inline-flex font-semibold text-brand underline-offset-2 hover:underline"
          >
            Open checklist
          </Link>
        </div>
      ) : null}

      <div className="mb-8 grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.85fr)] lg:items-stretch lg:gap-5">
        <section
          className="paper-box w-full min-w-0 px-4 py-8 text-center sm:px-8 sm:py-10"
          aria-label="Lease overview"
          data-onboarding="portal-dashboard-overview"
        >
          <p className="text-base font-medium text-ink sm:text-lg">Hello, {tenantName}</p>

          {leaseScheduleReady || rentReady ? (
            <div className="mt-8 space-y-6">
              {leaseScheduleReady && (
                <PortalPaymentScheduleTimeline
                  schedule={data.leaseSchedule}
                  className="mb-0 text-left"
                />
              )}
              {data.rentPayment ? (
                <PortalPayRentSection
                  embedded
                  rentPayment={data.rentPayment}
                  onInvoiceCreated={() => {
                    void refresh()
                  }}
                />
              ) : null}
            </div>
          ) : (
            <p className="mt-8 text-sm text-ink-muted sm:text-base">
              Your rent payment schedule will appear once your lease is set.
            </p>
          )}
        </section>

        {data.household ? (
          <PortalPropertyDetailsPanel household={data.household} className="mb-0" />
        ) : null}
      </div>

      <div className="mb-8" data-onboarding="portal-dashboard-timeline">
        {timelineLoading ? (
          <p className="py-4 text-center text-sm text-ink-muted">Loading your project timeline…</p>
        ) : timelineLinked && timelineSteps.length > 0 ? (
          <PortalTimelineView
            steps={timelineSteps}
            projectName={timelineProjectName || address || data.client?.projectName}
          />
        ) : (
          <p className="py-4 text-center text-sm text-ink-muted">
            Your project timeline will appear here as lease milestones unlock.
          </p>
        )}
      </div>

      <div className="mb-8 text-center">
        <PortalCurrentContracts
          contracts={data.contracts}
          contractStatus={data.client?.contractStatus}
          projectStarted={data.projectStarted}
          propertyAddress={address}
          tenantName={tenantName === 'there' ? '' : tenantName}
          onSigned={() => {
            void refresh()
          }}
        />
      </div>

      <div className="w-full min-w-0">
        <PortalInvoiceSection invoice={data.invoice} title="Deposit Invoice" />
        {data.remainingBalance && (
          <PortalRemainingBalanceSection balance={data.remainingBalance} />
        )}
        <PortalInvoiceSection invoice={data.finalInvoice} title="Final Invoice" />
      </div>

      <div className="mt-2 w-full min-w-0">
        <PortalProjectFilesSection
          className="mt-0"
          projectName={address || data.client?.projectName || 'your lease'}
          enabled={Boolean(data.projectStarted)}
          projectStarted={Boolean(data.projectStarted)}
          supportContact={data.supportContact}
          requireTenantPhoto={data.requireTenantPhoto !== false}
          tenantPhotoUploaded={Boolean(data.tenantPhotoUploaded)}
          onFilesChanged={() => {
            void refresh()
          }}
        />
      </div>
    </div>
  )
}
