import { Card, CardHeader } from '@/components/ui/Card'
import { HorizontalTimeline } from '@/components/timeline/HorizontalTimeline'
import type { ProjectTimelineStep } from '@/types'

interface PortalTimelineViewProps {
  steps: ProjectTimelineStep[]
  projectName?: string
}

export function PortalTimelineView({ steps, projectName }: PortalTimelineViewProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length

  return (
    <Card padding="lg">
      <CardHeader
        title="Project Timeline"
        subtitle={
          projectName
            ? `${completedCount} of ${steps.length} steps complete for ${projectName}`
            : `${completedCount} of ${steps.length} steps complete`
        }
      />

      <HorizontalTimeline steps={steps} variant="portal" />
    </Card>
  )
}
