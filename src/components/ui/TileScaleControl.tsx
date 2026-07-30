import { useEffect, useId, useRef, useState } from 'react'
import { ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TILE_SCALE_MAX,
  TILE_SCALE_MIN,
  TILE_SCALE_STEP,
} from '@/lib/tileScale'

interface TileScaleControlProps {
  value: number
  onChange: (value: number) => void
  className?: string
  /** Accessible name for the control group */
  label?: string
  /** `inline` shows a labeled slider; `button` uses a magnification popover; `row` is a compact single-line control */
  variant?: 'button' | 'inline' | 'row'
}

/**
 * Magnification control that scales tiles up or down.
 */
export function TileScaleControl({
  value,
  onChange,
  className,
  label = 'Tile size',
  variant = 'button',
}: TileScaleControlProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const sliderId = useId()

  useEffect(() => {
    if (!open || variant !== 'button') return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, variant])

  const sliderInput = (
    <input
      type="range"
      min={TILE_SCALE_MIN}
      max={TILE_SCALE_MAX}
      step={TILE_SCALE_STEP}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="tile-scale-slider w-full"
      aria-valuemin={TILE_SCALE_MIN}
      aria-valuemax={TILE_SCALE_MAX}
      aria-valuenow={value}
      aria-label={label}
    />
  )

  const slider = (
    <>
      {sliderInput}
      <div className="mt-1.5 flex justify-between text-[9px] font-medium uppercase tracking-caps text-ink-faint">
        <span>50%</span>
        <span>100%</span>
        <span>150%</span>
      </div>
    </>
  )

  if (variant === 'row') {
    return (
      <div
        ref={rootRef}
        id={sliderId}
        role="group"
        aria-label={label}
        className={cn(
          'inline-flex h-9 min-w-[12.5rem] flex-none items-center gap-2.5 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper px-3',
          'shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]',
          className
        )}
      >
        <p className="shrink-0 text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint whitespace-nowrap">
          {label}
        </p>
        <div className="min-w-[5.5rem] flex-1">{sliderInput}</div>
        <p className="shrink-0 text-xs font-semibold tabular-nums text-ink">{value}%</p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div ref={rootRef} className={cn('min-w-[11rem] max-w-xs', className)}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-faint">
            {label}
          </p>
          <p className="text-xs font-semibold tabular-nums text-ink">{value}%</p>
        </div>
        <div id={sliderId} role="group" aria-label={label}>
          {slider}
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? sliderId : undefined}
        aria-label={`${label}: ${value}%`}
        title={`${label}: ${value}%`}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper px-2.5 text-ink',
          'shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] transition-colors hover:border-brand/50',
          open && 'border-brand bg-brand/10 ring-1 ring-brand'
        )}
      >
        <ZoomIn className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-caps tabular-nums">
          {value}%
        </span>
      </button>

      {open && (
        <div
          id={sliderId}
          role="group"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-3 shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
              Magnification
            </p>
            <p className="text-xs font-semibold tabular-nums text-ink">{value}%</p>
          </div>
          {slider}
        </div>
      )}
    </div>
  )
}
