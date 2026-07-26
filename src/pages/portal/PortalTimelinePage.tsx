import { PageHeader } from '@/components/layout/PageHeader'
import { PortalTimelineView } from '@/components/portal/PortalTimelineView'
import { LoadingWithRefresh } from '@/components/ui/LoadingWithRefresh'
import { usePortalTimeline } from '@/hooks/usePortalTimeline'

export function PortalTimelinePage() {
  const { linked, projectName, steps, message, loading, error, retry } = usePortalTimeline()

  if (loading || error) {
    return (
      <div data-onboarding="portal-timeline-page">
        <LoadingWithRefresh
          message="Loading your timeline…"
          onRefresh={() => {
            void retry()
          }}
        />
      </div>
    )
  }

  if (!linked) {
    return (
      <div data-onboarding="portal-timeline-page">
        <PageHeader title="Timeline" subtitle="Project progress" />
        <p className="mt-4 text-sm text-ink-muted">{message}</p>
      </div>
    )
  }

  return (
    <div data-onboarding="portal-timeline-page">
      <PageHeader
        title="Timeline"
        subtitle="Track what’s done, what’s next, and where your project stands"
      />
      <PortalTimelineView steps={steps} projectName={projectName} />
    </div>
  )
}
