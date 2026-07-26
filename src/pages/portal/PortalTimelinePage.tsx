import { GitBranch } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortalTimelineView } from '@/components/portal/PortalTimelineView'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePortalTimeline } from '@/hooks/usePortalTimeline'

export function PortalTimelinePage() {
  const { linked, projectName, steps, message, loading, error } = usePortalTimeline()

  if (loading) {
    return (
      <div data-onboarding="portal-timeline-page" className="py-16 text-center text-ink-muted">
        Loading your timeline…
      </div>
    )
  }

  if (error) {
    return (
      <div data-onboarding="portal-timeline-page">
        <EmptyState icon={GitBranch} title="Something went wrong" description={error} />
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
