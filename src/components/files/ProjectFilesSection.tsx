import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Upload, File, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProjectFilePreviewModal } from '@/components/files/ProjectFilePreviewModal'
import {
  deleteProjectFileById,
  downloadProjectFile,
  fetchClientFiles,
  getProjectFileDownloadUrl,
  uploadClientFile,
} from '@/lib/filesApi'
import { canPreviewFile } from '@/lib/filePreview'
import { ApiError } from '@/lib/api'
import { cn, formatDate, formatFileSize } from '@/lib/utils'
import type { ProjectFile } from '@/types'

interface ProjectFilesSectionProps {
  clientId: string
  projectName: string
}

export function ProjectFilesSection({ clientId, projectName }: ProjectFilesSectionProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchClientFiles(clientId)
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load files')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5_000)
    return () => clearInterval(interval)
  }, [load])

  const handleDelete = async (file: ProjectFile) => {
    setDeletingId(file.id)
    setError('')
    try {
      await deleteProjectFileById(file.id)
      if (previewFile?.id === file.id) setPreviewFile(null)
      setDeleteConfirmId(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove file')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadClientFile(clientId, file)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section
      id="project-files"
      className="scroll-mt-24 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper"
    >
      <Card padding="lg" className="border-0 shadow-none">
        <CardHeader
          title="Project Files"
          subtitle={`Client portal uploads appear here in real time for ${projectName}`}
          action={
            <>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.svg,.webp"
              />
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
                Upload File
              </Button>
            </>
          }
        />

        {error && (
          <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-ink-muted">Loading files…</p>
        ) : files.length === 0 ? (
          <EmptyState
            icon={File}
            title="No files yet"
            description="Upload briefs, assets, leases, or reference materials for this project."
            action={
              <Button size="sm" onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload first file
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
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
                      canPreviewFile(file) ? 'Click to preview' : 'Click to view file details'
                    }
                  >
                    {file.originalName}
                  </button>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatFileSize(file.size)} · {file.uploadedByName}{' '}
                    {file.uploadedBy === 'client' ? (
                      <span className="font-semibold text-brand">(client)</span>
                    ) : (
                      '(admin)'
                    )}{' '}
                    · {formatDate(file.createdAt)}
                  </p>
                  {(file.notes?.length ?? 0) > 0 && (
                    <ul className="mt-2 space-y-2 border-l-2 border-brand/40 pl-3">
                      {file.notes!.map((note) => (
                        <li key={note.id}>
                          <p className="whitespace-pre-wrap break-words text-sm text-ink">
                            {note.text}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {note.authorName}{' '}
                            {note.authorRole === 'client' ? (
                              <span className="font-semibold text-brand">(client note)</span>
                            ) : (
                              '(admin)'
                            )}{' '}
                            · {formatDate(note.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadProjectFile(file.id, file.originalName)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDeleteConfirmId((current) => (current === file.id ? null : file.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>

                {deleteConfirmId === file.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-sm border border-accent/40 bg-accent-light/30 px-3 py-2">
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
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ProjectFilePreviewModal
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        downloadUrl={previewFile ? getProjectFileDownloadUrl(previewFile.id) : null}
        onDownload={() => {
          if (!previewFile) return
          void downloadProjectFile(previewFile.id, previewFile.originalName)
        }}
      />
    </section>
  )
}
