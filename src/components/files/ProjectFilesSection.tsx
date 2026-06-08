import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Upload, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { downloadProjectFile, fetchClientFiles, uploadClientFile } from '@/lib/filesApi'
import { ApiError } from '@/lib/api'
import { formatDate, formatFileSize } from '@/lib/utils'
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
            description="Upload briefs, assets, contracts, or reference materials for this project."
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
                  <p className="break-words font-semibold text-ink">{file.originalName}</p>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => downloadProjectFile(file.id, file.originalName)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
