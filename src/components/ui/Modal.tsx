import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'lg' | 'xl' | 'full'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }[size]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
      <div
        className={cn(
          'relative max-h-[90vh] w-full overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift',
          sizeClass
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b-[length:var(--border-width)] border-ink px-5 py-4">
          <h2 className="heading-display truncate pr-3 text-xl">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-transparent p-1 text-ink-muted hover:border-ink hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
