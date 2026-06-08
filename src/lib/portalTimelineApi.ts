import { apiFetch } from '@/lib/api'
import type { ProjectTimelineStep } from '@/types'

export async function fetchPortalTimeline() {
  return apiFetch<{
    linked: boolean
    projectName?: string
    steps: ProjectTimelineStep[]
    message?: string
  }>('/api/portal/timeline')
}
