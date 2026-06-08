import { getTimelineStepLabel } from '@/lib/timelineSteps'

export function buildTimelineSkipNoteText({
  clientName,
  skippedStepIds,
  targetStepId,
  customDetail,
}: {
  clientName: string
  skippedStepIds: string[]
  targetStepId: string
  customDetail?: string
}) {
  const skippedLines =
    skippedStepIds.length > 0
      ? skippedStepIds.map((id) => `• ${getTimelineStepLabel(id)}`).join('\n')
      : '• (none — advancing to next step)'

  let text = `Timeline skip for ${clientName}\n\nSkipped steps:\n${skippedLines}\n\nAdvanced to: ${getTimelineStepLabel(targetStepId)}`

  if (customDetail?.trim()) {
    text += `\n\nAdditional detail:\n${customDetail.trim()}`
  }

  return text
}
