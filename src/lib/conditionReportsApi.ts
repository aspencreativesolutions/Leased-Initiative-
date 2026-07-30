import { apiFetch, getToken, ApiError } from '@/lib/api'
import type {
  ConditionReport,
  ConditionReportItem,
  ConditionReportKind,
  ConditionReportStatus,
} from '@/types'

export async function fetchPortalConditionReports() {
  return apiFetch<{
    required: boolean
    reports: ConditionReport[]
  }>('/api/portal/condition-reports')
}

export async function fetchPortalConditionReport(reportId: string) {
  return apiFetch<{
    required: boolean
    report: ConditionReport
  }>(`/api/portal/condition-reports/${encodeURIComponent(reportId)}`)
}

export async function submitPortalConditionReport(input: {
  reportId: string
  items: Pick<ConditionReportItem, 'id' | 'condition' | 'notes'>[]
}) {
  return apiFetch<{
    ok: boolean
    message: string
    report: ConditionReport
  }>(`/api/portal/condition-reports/${encodeURIComponent(input.reportId)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ items: input.items }),
  })
}

export async function uploadConditionReportItemPhoto(input: {
  reportId: string
  itemId: string
  file: File
}) {
  const token = getToken()
  const formData = new FormData()
  formData.append('itemId', input.itemId)
  formData.append('file', input.file)

  const res = await fetch(
    `/api/portal/condition-reports/${encodeURIComponent(input.reportId)}/photos`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'Could not upload photo', res.status)
  }
  return data as { ok: boolean; report: ConditionReport; fileId: string }
}

export async function fetchAdminConditionReports(params?: {
  status?: ConditionReportStatus | 'all'
  kind?: ConditionReportKind | 'all'
}) {
  const q = new URLSearchParams()
  if (params?.status && params.status !== 'all') q.set('status', params.status)
  if (params?.kind && params.kind !== 'all') q.set('kind', params.kind)
  const suffix = q.toString() ? `?${q}` : ''
  return apiFetch<{ reports: ConditionReport[]; count: number }>(
    `/api/data/condition-reports${suffix}`
  )
}

export async function fetchAdminConditionReport(reportId: string) {
  return apiFetch<{ report: ConditionReport }>(
    `/api/data/condition-reports/${encodeURIComponent(reportId)}`
  )
}

export async function reviewConditionReport(input: {
  reportId: string
  action: 'approve' | 'request_changes'
  landlordNotes?: string
}) {
  return apiFetch<{ ok: boolean; report: ConditionReport }>(
    `/api/data/condition-reports/${encodeURIComponent(input.reportId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({
        action: input.action,
        landlordNotes: input.landlordNotes ?? '',
      }),
    }
  )
}
