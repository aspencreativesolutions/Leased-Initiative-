import { useEffect, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHelpIconProps {
  /** Descriptive copy shown in the tooltip / tap popover. */
  label: string
  className?: string
  /** Tooltip placement relative to the icon. */
  placement?: 'above' | 'below'
}

/**
 * Compact ? control that reveals section help on hover (desktop) or tap (mobile).
 */
export function SectionHelpIcon({
  label,
  className,
  placement = 'below',
}: SectionHelpIconProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <button
      ref={rootRef}
      type="button"
      className={cn(
        'quick-tooltip quick-tooltip--align-end inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        placement === 'below' && 'quick-tooltip--below',
        open && 'quick-tooltip--open',
        className
      )}
      data-tooltip={label}
      aria-label={label}
      aria-expanded={open}
      onClick={() => setOpen((prev) => !prev)}
    >
      <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
    </button>
  )
}
