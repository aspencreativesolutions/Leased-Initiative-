import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortalConditionReportForm } from '@/components/portal/PortalConditionReportForm'
import { usePortalDashboard } from '@/hooks/usePortalDashboard'
import {
  conditionReportKindLabel,
  conditionReportStatusLabel,
} from '@/lib/conditionReport'
import { cn } from '@/lib/utils'

export function PortalInspectionPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data, refresh } = usePortalDashboard()
  const reports = data?.conditionReports ?? []
  const kindParam = params.get('kind')
  const idParam = params.get('id')

  const selectedId = useMemo(() => {
    if (idParam && reports.some((r) => r.id === idParam)) return idParam
    if (kindParam === 'move_in' || kindParam === 'move_out') {
      const match = reports.find((r) => r.kind === kindParam)
      if (match) return match.id
    }
    const actionable = reports.find(
      (r) => r.status === 'pending' || r.status === 'changes_requested'
    )
    return actionable?.id ?? reports[0]?.id ?? null
  }, [reports, idParam, kindParam])

  if (!data?.linked) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Condition Report"
          subtitle="Connect to a lease to complete move-in and move-out inspection checklists."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg" data-onboarding="portal-condition-report-page">
      <PageHeader
        title="Condition Report"
        subtitle="Move-in and move-out inspection checklists — record the property’s condition and submit for landlord review."
      />

      {reports.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {reports.map((report) => {
            const active = report.id === selectedId
            return (
              <Link
                key={report.id}
                to={`/portal/inspection?id=${encodeURIComponent(report.id)}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm border-2 px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'border-brand bg-brand/10 font-semibold text-ink'
                    : 'border-line bg-surface text-ink-muted hover:border-ink/40 hover:text-ink'
                )}
              >
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                {conditionReportKindLabel(report.kind)}
                <span className="text-[10px] uppercase tracking-caps">
                  {conditionReportStatusLabel(report.status)}
                </span>
              </Link>
            )
          })}
        </div>
      ) : null}

      {selectedId ? (
        <PortalConditionReportForm
          reportId={selectedId}
          onSubmitted={() => {
            void refresh()
            navigate('/portal')
          }}
        />
      ) : (
        <p className="rounded-sm border-2 border-line bg-surface-paper px-3 py-4 text-sm text-ink-muted">
          No condition reports yet. They appear once your lease is official with start and end
          dates.
        </p>
      )}
    </div>
  )
}
