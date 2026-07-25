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
  /**
   * On viewports below `md`, fill nearly the full screen (safe-area aware).
   * Desktop keeps the standard centered dialog.
   */
  mobileCover?: boolean
  /** Optional controls shown in the top banner before the close (X) button. */
  headerActions?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  fitContent = false,
  mobileCover = false,
  headerActions,
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

  const mobileCoverMdSize = {
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-4xl',
    full: 'md:max-w-6xl',
  }[size]

  const dialog = (
    <div
      className={cn(
        'relative flex w-full flex-col border-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift',
        mobileCover
          ? cn(
              'h-full max-h-none max-w-none overflow-hidden rounded-none border-0',
              'md:h-auto md:max-h-[90vh] md:rounded-[var(--radius-lg)] md:border-[length:var(--border-width)]',
              mobileCoverMdSize,
              fitContent && 'md:overflow-visible'
            )
          : cn(
              'rounded-[var(--radius-lg)]',
              fitContent ? 'overflow-visible' : 'max-h-[90vh] overflow-hidden',
              sizeClass
            )
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-3 border-b-[length:var(--border-width)] border-ink px-5 py-3.5 sm:py-4',
          mobileCover &&
            'pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(0.875rem,env(safe-area-inset-top))] md:pt-3.5'
        )}
      >
        <h2 className="heading-display min-w-0 truncate pr-1 text-xl">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-transparent text-ink-muted hover:border-ink hover:text-ink md:h-auto md:w-auto md:p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      <div
        className={cn(
          'p-4 sm:p-5',
          mobileCover
            ? cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain',
                'px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
                'pb-[max(1rem,env(safe-area-inset-bottom))]',
                'md:max-h-[calc(90vh-4rem)] md:flex-none md:px-5 md:pb-5'
              )
            : fitContent
              ? 'overflow-visible'
              : 'max-h-[calc(90vh-4rem)] overflow-y-auto'
        )}
      >
        {children}
      </div>
    </div>
  )

  if (mobileCover) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden md:items-center md:justify-center md:p-4">
        <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
        <div className="relative flex h-full w-full flex-col md:h-auto md:max-h-[90vh] md:justify-center">
          {dialog}
        </div>
      </div>
    )
  }

  if (fitContent) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain">
        <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
        <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4">
          <div className="pointer-events-auto flex w-full justify-center">{dialog}</div>
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
