import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileText, Loader2, Upload } from 'lucide-react'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import {
  applyLeaseAgreementStyle,
  confirmLeaseAgreementTemplate,
  fetchLeaseAgreementTemplates,
  PENDING_TENANTS_RETURN_HREF,
  uploadLeaseAgreementTemplate,
} from '@/lib/leaseAgreementTemplatesApi'
import { cn, formatFileSize } from '@/lib/utils'
import type { BusinessSettings, Client, ContractData, LeaseAgreementTemplate } from '@/types'

const TEMPLATE_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function isPendingClient(client: Client) {
  if (client.isOfficialClient) return false
  return (
    client.contractStatus !== 'Signed' &&
    client.contractStatus !== 'Completed' &&
    client.contractStatus !== 'Cancelled'
  )
}

interface LeaseAgreementTemplatesSectionProps {
  /** When true, arrived from Pending Tenants — show return CTA + rim highlight */
  fromPendingTenants?: boolean
  onSettingsSynced?: (settings: BusinessSettings) => void
}

export function LeaseAgreementTemplatesSection({
  fromPendingTenants = false,
  onSettingsSynced,
}: LeaseAgreementTemplatesSectionProps) {
  const { clients, contracts, settings, updateSettings, refresh } = useApp()
  const navigate = useNavigate()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<LeaseAgreementTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState<'pending' | 'official' | null>(null)
  const [error, setError] = useState('')
  const [applyMessage, setApplyMessage] = useState('')
  const [pendingReview, setPendingReview] = useState<LeaseAgreementTemplate | null>(null)
  const [sampleClientId, setSampleClientId] = useState('')
  const [sampleOpen, setSampleOpen] = useState(false)
  const [rimPulse, setRimPulse] = useState(fromPendingTenants)

  useEffect(() => {
    if (!fromPendingTenants) return
    setRimPulse(true)
    const timer = window.setTimeout(() => setRimPulse(false), 4200)
    return () => window.clearTimeout(timer)
  }, [fromPendingTenants])

  const pendingClients = useMemo(
    () => clients.filter(isPendingClient).sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  )

  const sampleClient = pendingClients.find((c) => c.id === sampleClientId) || pendingClients[0]
  const sampleContract: ContractData | undefined = sampleClient
    ? contracts.find((c) => c.clientId === sampleClient.id)
    : undefined

  const activeTemplate =
    templates.find((t) => t.id === settings.defaultLeaseTemplateId && t.status === 'active') ||
    templates.find((t) => t.status === 'active') ||
    null

  const library = templates.filter((t) => t.status === 'active' || t.status === 'archived')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchLeaseAgreementTemplates()
      setTemplates(data.templates)
      const pending = data.templates.find((t) => t.status === 'pending_review')
      setPendingReview(pending || null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (pendingClients.length && !sampleClientId) {
      setSampleClientId(pendingClients[0].id)
    }
  }, [pendingClients, sampleClientId])

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { template } = await uploadLeaseAgreementTemplate(file)
      setPendingReview(template)
      setTemplates((prev) => [template, ...prev.filter((t) => t.id !== template.id)])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirm = async () => {
    if (!pendingReview) return
    setConfirming(true)
    setError('')
    try {
      const { template, settings: nextSettings } = await confirmLeaseAgreementTemplate(
        pendingReview.id
      )
      setPendingReview(null)
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id === template.id) return template
          if (t.status === 'active') return { ...t, status: 'archived' as const }
          return t
        })
      )
      updateSettings({
        defaultLeaseTemplateId: nextSettings.defaultLeaseTemplateId,
        defaultLeaseTemplateName: nextSettings.defaultLeaseTemplateName,
        leaseStyleReplacePrompt: nextSettings.leaseStyleReplacePrompt,
      })
      onSettingsSynced?.(nextSettings)
      setSampleOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save template')
    } finally {
      setConfirming(false)
    }
  }

  const defaultTemplateId =
    settings.defaultLeaseTemplateId ||
    activeTemplate?.id ||
    undefined

  const handleApply = async (scope: 'pending' | 'official') => {
    if (!defaultTemplateId) {
      setError('Confirm a default lease style before applying.')
      return
    }
    setApplying(scope)
    setError('')
    setApplyMessage('')
    try {
      const result = await applyLeaseAgreementStyle({
        scope,
        templateId: defaultTemplateId,
      })
      await refresh()
      updateSettings({
        leaseStyleReplacePrompt: result.settings.leaseStyleReplacePrompt ?? null,
      })
      const noun = scope === 'pending' ? 'pending' : 'official'
      setApplyMessage(
        result.updatedCount === 0
          ? `No ${noun} leases to restyle.`
          : `Restyled ${result.updatedCount} ${noun} lease${result.updatedCount === 1 ? '' : 's'}.`
      )
      if (scope === 'pending') {
        window.setTimeout(() => navigate(PENDING_TENANTS_RETURN_HREF), 700)
      } else {
        window.setTimeout(() => navigate('/studio/contracts'), 700)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply lease style')
    } finally {
      setApplying(null)
    }
  }

  const styledSampleContract =
    sampleContract && pendingReview
      ? {
          ...sampleContract,
          leaseTemplateId: pendingReview.id,
          leaseStyleName: pendingReview.styleLabel || pendingReview.name,
        }
      : sampleContract

  const returnLinkClass =
    'inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline'

  return (
    <section
      id="lease-agreement-templates"
      data-onboarding="admin-lease-agreement-templates"
      className={cn(
        'scroll-mt-28 space-y-4 rounded-[var(--radius-lg)] border-2 bg-surface/50 p-4',
        rimPulse
          ? 'lease-templates-section--breathe border-brand'
          : 'border-line'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="heading-display text-base text-ink">Lease Agreement Templates</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Upload a PDF or Word lease to set your default style and format. New drafts and restyles
            keep each tenant’s rent, address, and signature — only the document style changes.
          </p>
        </div>
        {fromPendingTenants ? (
          <Link to={PENDING_TENANTS_RETURN_HREF} className={returnLinkClass}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Return to Pending Tenants
          </Link>
        ) : null}
      </div>

      {fromPendingTenants ? (
        <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand/5 px-3 py-2 text-xs text-ink">
          Confirm a style below, then apply it to pending tenants, official tenants, or both.
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-accent" role="alert">
          {error}
        </p>
      ) : null}

      {applyMessage ? (
        <p className="text-sm font-semibold text-brand" role="status">
          {applyMessage}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading templates…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={TEMPLATE_ACCEPT}
              className="sr-only"
              onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Upload PDF or DOC template'}
            </Button>
            {activeTemplate ? (
              <p className="text-xs text-ink-muted">
                Current default:{' '}
                <span className="font-semibold text-ink">{activeTemplate.styleLabel}</span>
              </p>
            ) : (
              <p className="text-xs text-ink-muted">
                No custom default yet — built-in residential style is used.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!defaultTemplateId || applying !== null}
              title={
                defaultTemplateId
                  ? 'Restyle all pending leases with your default template'
                  : 'Confirm a default lease style first'
              }
              onClick={() => void handleApply('pending')}
            >
              {applying === 'pending' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Apply to all pending tenants
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!defaultTemplateId || applying !== null}
              title={
                defaultTemplateId
                  ? 'Restyle all official tenant leases with your default template'
                  : 'Confirm a default lease style first'
              }
              onClick={() => void handleApply('official')}
            >
              {applying === 'official' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Apply to all official tenants
            </Button>
          </div>

          {pendingReview ? (
            <div className="space-y-3 rounded-[var(--radius-md)] border-2 border-brand/40 bg-brand/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    New style ready for review: {pendingReview.styleLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {pendingReview.originalFileName} · {formatFileSize(pendingReview.size)}
                  </p>
                </div>
                <FileText className="h-5 w-5 shrink-0 text-brand" aria-hidden />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[12rem] flex-1">
                  <Select
                    label="Sample with pending tenant"
                    value={sampleClient?.id || ''}
                    onChange={(e) => setSampleClientId(e.target.value)}
                    disabled={pendingClients.length === 0}
                  >
                    {pendingClients.length === 0 ? (
                      <option value="">No pending tenants yet</option>
                    ) : (
                      pendingClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!sampleClient || !styledSampleContract}
                  onClick={() => setSampleOpen(true)}
                >
                  View sample
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-brand/20 pt-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={confirming}
                  onClick={() => void handleConfirm()}
                >
                  {confirming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Confirm as default
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={confirming}
                  onClick={() => setPendingReview(null)}
                >
                  Cancel
                </Button>
                {fromPendingTenants ? (
                  <Link to={PENDING_TENANTS_RETURN_HREF} className={cn(returnLinkClass, 'ml-auto')}>
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    Return to Pending Tenants
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {library.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Template library
              </p>
              <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface-paper">
                {library.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2.5 text-sm',
                      t.status === 'active' && 'bg-brand/5'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{t.styleLabel}</p>
                      <p className="truncate text-xs text-ink-muted">{t.originalFileName}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-caps',
                        t.status === 'active'
                          ? 'bg-brand/15 text-brand'
                          : 'bg-surface text-ink-muted'
                      )}
                    >
                      {t.status === 'active' ? 'Default' : 'Archived'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={sampleOpen && Boolean(styledSampleContract && sampleClient && pendingReview)}
        onClose={() => setSampleOpen(false)}
        title="Sample lease with new style"
        size="xl"
      >
        {styledSampleContract && sampleClient && pendingReview ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Preview for <strong className="text-ink">{sampleClient.name}</strong> using style{' '}
              <strong className="text-ink">{pendingReview.styleLabel}</strong>. Confirm to save this
              as your default, or cancel to keep reviewing.
            </p>
            <div className="max-h-[55vh] overflow-y-auto rounded-[var(--radius-md)] border border-line">
              <ContractReviewView
                contract={styledSampleContract}
                designerName={settings.ownerName}
                businessName={settings.businessName}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <Button type="button" disabled={confirming} onClick={() => void handleConfirm()}>
                {confirming ? 'Saving…' : 'Confirm new style'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSampleOpen(false)}>
                Cancel
              </Button>
              {fromPendingTenants ? (
                <Link to={PENDING_TENANTS_RETURN_HREF} className={cn(returnLinkClass, 'ml-auto')}>
                  Return to Pending Tenants
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
