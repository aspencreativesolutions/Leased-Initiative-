import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { ApiError } from '@/lib/api'
import { PORTAL_PHOTO_ACCEPT, PORTAL_PHOTO_TYPES_LABEL } from '@/lib/allowedFileTypes'
import {
  CONDITION_ITEM_RATINGS,
  conditionReportKindLabel,
  conditionReportStatusLabel,
  isChecklistComplete,
} from '@/lib/conditionReport'
import {
  fetchPortalConditionReport,
  submitPortalConditionReport,
  uploadConditionReportItemPhoto,
} from '@/lib/conditionReportsApi'
import { cn } from '@/lib/utils'
import type { ConditionItemRating, ConditionReport, ConditionReportItem } from '@/types'

interface PortalConditionReportFormProps {
  reportId: string
  onSubmitted?: () => void
}

function isPhotoFile(file: File) {
  return file.type.startsWith('image/') && !file.type.includes('svg')
}

export function PortalConditionReportForm({
  reportId,
  onSubmitted,
}: PortalConditionReportFormProps) {
  const [report, setReport] = useState<ConditionReport | null>(null)
  const [required, setRequired] = useState(true)
  const [items, setItems] = useState<ConditionReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoTargetItemId, setPhotoTargetItemId] = useState<string | null>(null)

  const editable = report?.status === 'pending' || report?.status === 'changes_requested'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPortalConditionReport(reportId)
      setReport(data.report)
      setRequired(data.required)
      setItems(data.report.items.map((item) => ({ ...item })))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load condition report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [reportId])

  const grouped = useMemo(() => {
    const map = new Map<string, ConditionReportItem[]>()
    for (const item of items) {
      const list = map.get(item.area) ?? []
      list.push(item)
      map.set(item.area, list)
    }
    return [...map.entries()]
  }, [items])

  const updateItem = (itemId: string, patch: Partial<ConditionReportItem>) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)))
  }

  const handlePhotoPick = async (file: File | null) => {
    if (!file || !photoTargetItemId || !report) return
    if (!isPhotoFile(file)) {
      setError('Attach a photo (JPG, PNG, or WEBP).')
      return
    }
    setUploadingItemId(photoTargetItemId)
    setError('')
    try {
      const result = await uploadConditionReportItemPhoto({
        reportId: report.id,
        itemId: photoTargetItemId,
        file,
      })
      setReport(result.report)
      setItems(result.report.items.map((item) => ({ ...item })))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo')
    } finally {
      setUploadingItemId(null)
      setPhotoTargetItemId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report || !editable) return
    setError('')
    setSuccess('')
    if (!isChecklistComplete(items)) {
      setError('Rate every checklist item before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const result = await submitPortalConditionReport({
        reportId: report.id,
        items: items.map((item) => ({
          id: item.id,
          condition: item.condition,
          notes: item.notes,
        })),
      })
      setReport(result.report)
      setItems(result.report.items.map((item) => ({ ...item })))
      setSuccess(result.message)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit condition report')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading checklist…
      </p>
    )
  }

  if (!report) {
    return (
      <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
        {error || 'Condition report not found.'}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-onboarding="portal-condition-report">
      <div className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden />
          <h2 className="text-base font-bold text-ink">
            {conditionReportKindLabel(report.kind)} Condition Report
          </h2>
          <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
            {conditionReportStatusLabel(report.status)}
          </span>
          <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
            {required ? 'Required' : 'Optional'}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Record the current state of the property — windows, blinds, utilities, and more. Add
          notes and photos for anything fair, poor, or damaged so your landlord has a clear
          record.
          {report.dueDate ? (
            <>
              {' '}
              Due by <strong className="font-semibold text-ink">{report.dueDate}</strong>.
            </>
          ) : null}
        </p>
        {report.landlordNotes ? (
          <p className="mt-3 rounded-sm border border-accent/40 bg-accent-light/40 px-3 py-2 text-sm text-ink">
            Landlord notes: {report.landlordNotes}
          </p>
        ) : null}
      </div>

      {grouped.map(([area, areaItems]) => (
        <fieldset
          key={area}
          className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5"
        >
          <legend className="px-1 text-sm font-bold text-ink">{area}</legend>
          <ul className="mt-3 space-y-4">
            {areaItems.map((item) => (
              <li key={item.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="list">
                  {CONDITION_ITEM_RATINGS.map((rating) => {
                    const selected = item.condition === rating.value
                    return (
                      <button
                        key={rating.value}
                        type="button"
                        role="listitem"
                        disabled={!editable}
                        aria-pressed={selected}
                        onClick={() =>
                          updateItem(item.id, {
                            condition: rating.value as ConditionItemRating,
                          })
                        }
                        className={cn(
                          'rounded-sm border-2 px-2.5 py-1 text-xs transition-colors',
                          selected
                            ? 'border-brand bg-brand/10 font-semibold text-ink'
                            : 'border-line bg-surface text-ink-muted hover:border-ink/40 hover:text-ink',
                          !editable && 'cursor-default opacity-70'
                        )}
                      >
                        {rating.label}
                      </button>
                    )
                  })}
                </div>
                {editable ? (
                  <div className="mt-2">
                    <Textarea
                      label="Notes"
                      rows={2}
                      value={item.notes ?? ''}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      hint="Optional — describe stains, cracks, missing items, etc."
                    />
                  </div>
                ) : item.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{item.notes}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(item.photoFileIds?.length ?? 0) > 0 ? (
                    <span className="text-xs text-ink-muted">
                      {item.photoFileIds!.length} photo
                      {item.photoFileIds!.length === 1 ? '' : 's'} attached
                    </span>
                  ) : null}
                  {editable ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={uploadingItemId === item.id}
                      onClick={() => {
                        setPhotoTargetItemId(item.id)
                        fileInputRef.current?.click()
                      }}
                    >
                      {uploadingItemId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Camera className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Add photo
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept={PORTAL_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void handlePhotoPick(e.target.files?.[0] ?? null)
        }}
      />
      <p className="text-xs text-ink-faint">Photos optional — {PORTAL_PHOTO_TYPES_LABEL}</p>

      {error ? (
        <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="flex items-center gap-2 rounded-sm border-2 border-brand/30 bg-brand/5 px-3 py-2 text-sm text-ink">
          <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden />
          {success}
        </p>
      ) : null}

      {editable ? (
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Submit for landlord review
        </Button>
      ) : null}
    </form>
  )
}
