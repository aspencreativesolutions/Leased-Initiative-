import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download,
  File,
  FolderUp,
  HelpCircle,
  Loader2,
  MessageSquarePlus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PortalAssistanceModal } from '@/components/portal/PortalAssistanceModal'
import { ProjectFilePreviewModal } from '@/components/files/ProjectFilePreviewModal'
import {
  addPortalFileNote,
  deletePortalFile,
  downloadPortalFile,
  fetchPortalFiles,
  getPortalFileDownloadUrl,
  uploadPortalFile,
} from '@/lib/filesApi'
import { canPreviewFile } from '@/lib/filePreview'
import { PORTAL_FILE_ACCEPT, PORTAL_FILE_TYPES_LABEL } from '@/lib/allowedFileTypes'
import { ApiError } from '@/lib/api'
import { cn, formatDate, formatFileSize } from '@/lib/utils'
import type { PortalSupportContact, ProjectFile } from '@/types'

interface PortalProjectFilesSectionProps {
  projectName: string
  enabled: boolean
  projectStarted?: boolean
  supportContact?: PortalSupportContact
  className?: string
}

async function collectFilesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = []
  const items = dataTransfer.items

  const traverse = async (entry: FileSystemEntry, path = ''): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      if (path) {
        Object.defineProperty(file, 'name', {
          value: `${path}/${file.name}`,
          writable: false,
        })
      }
      files.push(file)
      return
    }
    if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })
      for (const child of entries) {
        await traverse(child, path ? `${path}/${entry.name}` : entry.name)
      }
    }
  }

  if (items && items.length > 0) {
    for (const item of items) {
      if (item.kind !== 'file') continue
      const entry = item.webkitGetAsEntry?.()
      if (entry) {
        await traverse(entry)
      } else {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
  } else {
    for (const file of Array.from(dataTransfer.files)) {
      files.push(file)
    }
  }

  return files
}

function FileNoteEditor({
  fileId,
  onSaved,
}: {
  fileId: string
  onSaved: () => void
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError('')
    try {
      await addPortalFileNote(fileId, text)
      setText('')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-sm border border-line bg-surface p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type or paste notes for your designer — context, revisions, links, etc."
        className="w-full resize-y rounded-sm border-2 border-ink/10 bg-surface-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={saving || !text.trim()} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save note'}
        </Button>
        {error && <p className="text-xs text-accent">{error}</p>}
      </div>
    </div>
  )
}

export function PortalProjectFilesSection({
  projectName,
  enabled,
  projectStarted = false,
  supportContact,
  className,
}: PortalProjectFilesSectionProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [uploadNote, setUploadNote] = useState('')
  const [assistanceOpen, setAssistanceOpen] = useState(false)
  const [noteOpenFor, setNoteOpenFor] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!enabled) {
      setFiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchPortalFiles()
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load files')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    load()
    if (!enabled) return
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [load, enabled])

  const uploadFiles = async (fileList: File[]) => {
    if (!enabled || fileList.length === 0) return
    setUploading(true)
    setError('')
    const note = uploadNote.trim()
    try {
      for (const file of fileList) {
        await uploadPortalFile(file, note)
      }
      if (note) setUploadNote('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = await collectFilesFromDrop(e.dataTransfer)
    await uploadFiles(dropped)
  }

  const handleDelete = async (file: ProjectFile) => {
    setDeletingId(file.id)
    setError('')
    try {
      await deletePortalFile(file.id)
      if (previewFile?.id === file.id) setPreviewFile(null)
      if (noteOpenFor === file.id) setNoteOpenFor(null)
      setDeleteConfirmId(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove file')
    } finally {
      setDeletingId(null)
    }
  }

  if (!enabled) {
    return (
      <section className={cn('mt-8', className)}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="label-caps flex items-center gap-2">
            <FolderUp className="h-4 w-4" />
            Project Files
          </h2>
          <Button size="sm" variant="outline" onClick={() => setAssistanceOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            Assistance
          </Button>
        </div>
        <Card padding="md" className="border-dashed border-line bg-surface">
          <p className="text-sm text-ink-muted">
            {projectStarted
              ? 'File sharing is being set up.'
              : 'File sharing unlocks once your designer starts the project. Sign your contract, pay your deposit invoice, and your designer will activate the project.'}
          </p>
        </Card>
        <PortalAssistanceModal
          open={assistanceOpen}
          onClose={() => setAssistanceOpen(false)}
          supportContact={supportContact}
        />
      </section>
    )
  }

  return (
    <section className={cn('mt-8', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="label-caps flex items-center gap-2">
          <FolderUp className="h-4 w-4" />
          Project Files
        </h2>
        <Button size="sm" variant="outline" onClick={() => setAssistanceOpen(true)}>
          <HelpCircle className="h-4 w-4" />
          Assistance
        </Button>
      </div>
      <p className="mb-3 text-sm text-ink-muted">
        Upload {PORTAL_FILE_TYPES_LABEL} for {projectName}. Add notes to explain what you&apos;re
        sending — your designer sees them linked to each file.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
        <label className="flex min-h-0 flex-col">
          <span className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
            Note for your upload (optional)
          </span>
          <textarea
            value={uploadNote}
            onChange={(e) => setUploadNote(e.target.value)}
            rows={5}
            placeholder="Describe this batch of files — e.g. brand logos, homepage copy, reference photos…"
            className="mt-1 min-h-[10.5rem] w-full flex-1 resize-y rounded-sm border-2 border-ink/10 bg-surface-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none sm:min-h-0"
          />
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex min-h-[10.5rem] flex-col justify-center rounded-sm border-2 border-dashed p-4 transition-colors sm:min-h-0 sm:p-6',
            dragOver ? 'border-brand bg-brand/5' : 'border-line bg-surface-paper'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={PORTAL_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : []
              void uploadFiles(list)
              if (inputRef.current) inputRef.current.value = ''
            }}
          />
          <div className="flex flex-col items-center gap-3 text-center">
            <FolderUp className="h-8 w-8 text-ink-faint" />
            <p className="text-sm font-medium text-ink">Drag and drop files here</p>
            <p className="text-xs text-ink-muted">{PORTAL_FILE_TYPES_LABEL}</p>
            <Button
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Choose files
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading files…</p>
        ) : files.length === 0 ? (
          <EmptyState
            icon={File}
            title="No files shared yet"
            description="Drop project assets here when you're ready. Use Add Note on each upload to give your designer context."
          />
        ) : (
          <ul className="divide-y divide-line rounded-sm border-2 border-ink/10 bg-surface-paper">
            {files.map((file) => (
              <li key={file.id} className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className={cn(
                        'break-words text-left font-semibold text-ink transition-colors',
                        canPreviewFile(file)
                          ? 'cursor-pointer hover:text-brand hover:underline'
                          : 'cursor-pointer hover:text-ink-muted'
                      )}
                      title={
                        canPreviewFile(file)
                          ? 'Click to preview'
                          : 'Click to view file details'
                      }
                    >
                      {file.originalName}
                    </button>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatFileSize(file.size)} · {file.uploadedByName}{' '}
                      {file.uploadedBy === 'client' ? '(you)' : '(designer)'} ·{' '}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNoteOpenFor((current) => (current === file.id ? null : file.id))
                      }
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Add Note
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPortalFile(file.id, file.originalName)}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {file.uploadedBy === 'client' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDeleteConfirmId((current) =>
                            current === file.id ? null : file.id
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {deleteConfirmId === file.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-accent/40 bg-accent-light/30 px-3 py-2">
                    <p className="text-xs text-ink">
                      Remove <strong>{file.originalName}</strong>? This cannot be undone.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deletingId === file.id}
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={deletingId === file.id}
                      onClick={() => void handleDelete(file)}
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Remove file'
                      )}
                    </Button>
                  </div>
                )}

                {(file.notes?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-2 border-l-2 border-brand/30 pl-3">
                    {file.notes!.map((note) => (
                      <li key={note.id} className="text-sm">
                        <p className="whitespace-pre-wrap break-words text-ink">{note.text}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {note.authorName} · {formatDate(note.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {noteOpenFor === file.id && (
                  <FileNoteEditor fileId={file.id} onSaved={() => load()} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PortalAssistanceModal
        open={assistanceOpen}
        onClose={() => setAssistanceOpen(false)}
        supportContact={supportContact}
      />

      <ProjectFilePreviewModal
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        downloadUrl={previewFile ? getPortalFileDownloadUrl(previewFile.id) : null}
        onDownload={() => {
          if (!previewFile) return
          void downloadPortalFile(previewFile.id, previewFile.originalName)
        }}
      />
    </section>
  )
}
