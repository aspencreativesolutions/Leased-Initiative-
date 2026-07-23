import { apiFetch } from '@/lib/api'
import { ASPEN_SUPPORT_EMAIL } from '@/lib/navToolbar'

export async function submitBugReport(input: {
  description: string
  stepsToReproduce?: string
}) {
  return apiFetch<{ ok: boolean; message: string }>('/api/data/bug-reports', {
    method: 'POST',
    body: JSON.stringify({
      description: input.description.trim(),
      stepsToReproduce: (input.stepsToReproduce ?? '').trim(),
    }),
  })
}

export function buildAspenSupportMailto(subject = 'Leased Initiative support') {
  return `mailto:${ASPEN_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
