import { getToken, apiFetch, ApiError } from '@/lib/api'
import type {
  BusinessSettings,
  ContractData,
  LeaseAgreementTemplate,
  LeaseStyleReplacePrompt,
} from '@/types'

export type LeaseStyleApplyScope = 'pending' | 'official' | 'selected'

export async function fetchLeaseAgreementTemplates() {
  return apiFetch<{
    templates: LeaseAgreementTemplate[]
    defaultLeaseTemplateId: string | null
    leaseStyleReplacePrompt: LeaseStyleReplacePrompt | null
  }>('/api/lease-templates')
}

export async function uploadLeaseAgreementTemplate(file: File) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/lease-templates/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'Upload failed', res.status)
  }
  return data as { template: LeaseAgreementTemplate }
}

export async function confirmLeaseAgreementTemplate(templateId: string) {
  return apiFetch<{ template: LeaseAgreementTemplate; settings: BusinessSettings }>(
    `/api/lease-templates/${templateId}/confirm`,
    { method: 'POST', body: JSON.stringify({}) }
  )
}

export async function applyLeaseAgreementStyle(options: {
  scope: LeaseStyleApplyScope
  templateId?: string
  contractIds?: string[]
  surface?: 'pending' | 'contracts'
}) {
  return apiFetch<{
    ok: boolean
    updatedCount: number
    template: LeaseAgreementTemplate
    contracts: ContractData[]
    settings: BusinessSettings
  }>('/api/lease-templates/apply', {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

export async function dismissLeaseStyleReplacePrompt(options: {
  pending?: boolean
  contracts?: boolean
}) {
  return apiFetch<{ settings: BusinessSettings }>('/api/lease-templates/prompt/dismiss', {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

export function leaseTemplateFileDownloadUrl(fileId: string) {
  return `/api/lease-templates/files/${fileId}/download`
}

/** Deep-link into Help and Settings → Lease Defaults → templates, optionally from Pending Tenants. */
export function leaseTemplatesSettingsHref(fromPending = false) {
  const params = new URLSearchParams({ tab: 'lease' })
  if (fromPending) params.set('from', 'pending-tenants')
  return `/studio/settings?${params.toString()}#lease-agreement-templates`
}

export const PENDING_TENANTS_RETURN_HREF = '/studio#dashboard-pending-tenants-list'
