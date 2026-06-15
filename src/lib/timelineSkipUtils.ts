import type { ProjectTimelineStep } from '@/types'

export function getSkippableTargetSteps(steps: ProjectTimelineStep[]): ProjectTimelineStep[] {
  const activeIdx = steps.findIndex((s) => s.status === 'active')
  const startIdx =
    activeIdx >= 0 ? activeIdx + 1 : steps.findIndex((s) => s.status === 'pending')
  if (startIdx < 0) return []
  return steps.slice(startIdx).filter((s) => s.status === 'pending')
}

export function getSkippedStepsForTarget(
  steps: ProjectTimelineStep[],
  targetStepId: string
): ProjectTimelineStep[] {
  const targetIdx = steps.findIndex((s) => s.id === targetStepId)
  if (targetIdx < 0) return []

  return steps.slice(0, targetIdx).filter((s) => s.status !== 'completed')
}
