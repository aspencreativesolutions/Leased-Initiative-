import { useEffect, useId, useRef, useState } from 'react'
import { Download, File, Loader2, Pencil, Send, Upload } from 'lucide-react'
import { AutoSendLeaseToggle } from '@/components/contracts/AutoSendLeaseToggle'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { ALLOWED_FILE_ACCEPT, ALLOWED_FILE_LABEL } from '@/lib/allowedUploadTypes'
import {
  downloadProjectFile,
  fetchAuthenticatedFileBlob,
  getProjectFileDownloadUrl,
  uploadClientFile,
} from '@/lib/filesApi'
import { getFilePreviewKind } from '@/lib/filePreview'
import { downloadContractPdf } from '@/lib/pdf'
import type { Client, ContractData } from '@/types'

interface LeaseAgreementPreviewModalProps {
  open: boolean
  onClose: () => void
  client: Client
  contract: ContractData
  /** Opens the send flow (SendContractModal). Always available from the top banner. */
  onSend: () => void
  /** Navigate to the full lease editor. */
  onEditDraft?: () => void
}

export function LeaseAgreementPreviewModal({
  open,
  onClose,
  client,
  contract,
  onSend,
  onEditDraft,
}: LeaseAgreementPreviewModalProps) {
  const { settings, saveContract, getContractForClient } = useApp()
  const liveContract = getContractForClient(client.id) ?? contract
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const replacementFileId = liveContract.replacementDocumentFileId?.trim() || ''
  const replacementName =
    liveContract.replacementDocumentName?.trim() || 'Uploaded lease document'
  const replacementMime =
    liveContract.replacementDocumentMimeType?.trim() || 'application/octet-stream'
  const hasReplacement = Boolean(replacementFileId)
  const previewKind = hasReplacement
    ? getFilePreviewKind({
        originalName: replacementName,
        mimeType: replacementMime,
      })
    : null

  useEffect(() => {
    if (!open || !replacementFileId || previewKind === 'unsupported' || !previewKind) {
      setPreviewUrl(null)
      setPreviewError('')
      setPreviewLoading(false)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    const load = async () => {
      setPreviewLoading(true)
      setPreviewError('')
      try {
        const blob = await fetchAuthenticatedFileBlob(
          getProjectFileDownloadUrl(replacementFileId)
        )
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (cancelled) return
        setPreviewError(err instanceof ApiError ? err.message : 'Could not load document preview')
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    }
  }, [open, replacementFileId, previewKind])

  useEffect(() => {
    if (!open) {
      setUploadError('')
      setUploading(false)
    }
  }, [open])

  const handleDownload = async () => {
    if (hasReplacement) {
      try {
        await downloadProjectFile(replacementFileId, replacementName)
      } catch (err) {
        setUploadError(err instanceof ApiError ? err.message : 'Could not download document')
      }
      return
    }
    downloadContractPdf(liveContract, settings)
  }

  const handleUploadReplacement = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const { file: uploaded } = await uploadClientFile(client.id, file)
      await saveContract(
        {
          ...liveContract,
          replacementDocumentFileId: uploaded.id,
          replacementDocumentName: uploaded.originalName,
          replacementDocumentMimeType: uploaded.mimeType,
          pdfGenerated: true,
          isPlaceholderDraft: false,
        },
        { asDraft: !liveContract.sentAt }
      )
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sendLabel = liveContract.sentAt ? 'Resend' : 'Send'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lease Agreement Preview"
      size="xl"
      headerActions={
        <Button
          type="button"
          size="sm"
          onClick={onSend}
          title={
            liveContract.sentAt
              ? 'Resend this lease to the tenant'
              : 'Send this lease to the tenant when ready'
          }
          aria-label={sendLabel}
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          {sendLabel}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={uploading}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Upload Replacement'}
            </Button>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={ALLOWED_FILE_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUploadReplacement(file)
              }}
            />
            {onEditDraft && !hasReplacement ? (
              <Button type="button" size="sm" variant="ghost" onClick={onEditDraft}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit draft
              </Button>
            ) : null}
          </div>
          <AutoSendLeaseToggle compact />
        </div>

        <p className="text-sm text-ink-muted">
          {hasReplacement
            ? `Showing uploaded document: ${replacementName}. Download or replace it anytime, then Send when you’re ready.`
            : `Review the generated draft, download a PDF, or upload a signed/custom lease to replace it. Nothing goes to the tenant until you click ${sendLabel}.`}
        </p>
        <p className="text-[11px] text-ink-faint">Accepted uploads: {ALLOWED_FILE_LABEL}.</p>

        {uploadError ? (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {uploadError}
          </p>
        ) : null}

        {hasReplacement ? (
          previewKind === 'unsupported' ? (
            <div className="flex flex-col items-center gap-4 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-10 text-center">
              <File className="h-12 w-12 text-ink-faint" aria-hidden />
              <p className="text-sm text-ink-muted">
                In-app preview isn’t available for this file type. Download it to open on your
                device — the replacement is saved on this lease.
              </p>
              <Button size="sm" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4" aria-hidden />
                Download {replacementName}
              </Button>
            </div>
          ) : previewLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading document preview…
            </div>
          ) : previewError ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-accent">{previewError}</p>
              <Button size="sm" variant="outline" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4" aria-hidden />
                Download instead
              </Button>
            </div>
          ) : previewKind === 'image' && previewUrl ? (
            <div className="flex justify-center bg-ink/5 p-2">
              <img
                src={previewUrl}
                alt={replacementName}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
          ) : previewKind === 'pdf' && previewUrl ? (
            <iframe
              src={previewUrl}
              title={replacementName}
              className="h-[70vh] w-full rounded-sm border border-line bg-surface"
            />
          ) : null
        ) : (
          <ContractReviewView
            contract={liveContract}
            designerName={settings.ownerName}
            businessName={settings.businessName}
          />
        )}
      </div>
    </Modal>
  )
}
