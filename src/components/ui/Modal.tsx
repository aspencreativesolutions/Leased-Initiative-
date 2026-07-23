import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'lg' | 'xl' | 'full'
  /** Grow with content; scroll the viewport overlay instead of an inner panel scrollbar. */
  fitContent?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  fitContent = false,
}: ModalProps) {
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

  const dialog = (
    <div
      className={cn(
        'relative w-full rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift',
        fitContent ? 'overflow-visible' : 'max-h-[90vh] overflow-hidden',
        sizeClass
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between border-b-[length:var(--border-width)] border-ink px-5 py-3.5 sm:py-4">
        <h2 className="heading-display truncate pr-3 text-xl">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-transparent p-1 text-ink-muted hover:border-ink hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
      <div
        className={cn(
          'p-4 sm:p-5',
          fitContent ? 'overflow-visible' : 'max-h-[calc(90vh-4rem)] overflow-y-auto'
        )}
      >
        {children}
      </div>
    </div>
  )

  if (fitContent) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain">
        <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
        <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4">
          <div className="pointer-events-auto w-full flex justify-center">{dialog}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
      {dialog}
    </div>
  )
}
