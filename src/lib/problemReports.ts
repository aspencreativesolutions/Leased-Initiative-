import { getToken, apiFetch, ApiError } from '@/lib/api'
import type { ProjectFile } from '@/types'

/** Matches server/routes/portal.js PROBLEM_TYPES — common household issues */
export const PROBLEM_TYPES = [
  'Leaking faucet / plumbing',
  'Electrical problems',
  'Heating or cooling issues',
  'Broken appliance',
  'Pest infestation',
  'Water damage / flooding',
  'Locks or security',
  'Structural damage',
  'Other',
] as const

export type ProblemType = (typeof PROBLEM_TYPES)[number]

export async function submitPortalProblemReport(input: {
  problemType: string
  note: string
  file: File
}) {
  const token = getToken()
  const formData = new FormData()
  formData.append('problemType', input.problemType)
  formData.append('note', input.note.trim())
  formData.append('file', input.file)

  const res = await fetch('/api/portal/problems', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'Could not submit problem report', res.status)
  }
  return data as { ok: boolean; message: string; file: ProjectFile }
}

export async function fetchTenantProblemAlerts() {
  return apiFetch<{ notifications: import('@/types').AdminNotification[]; count: number }>(
    '/api/data/notifications?type=problem_report&includeRead=1'
  )
}
