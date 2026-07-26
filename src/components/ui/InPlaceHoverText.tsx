import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type InPlaceHoverTextProps = {
  /** Default visible copy */
  primary: ReactNode
  /** Replaces primary on hover / focus / first tap */
  secondary: ReactNode
  /** Screen-reader label covering both states (and action, when any) */
  ariaLabel: string
  className?: string
  /** Inline styles on the control (e.g. shared animation phase vars). */
  style?: CSSProperties
  /** Classes for the shared text layers (font size, etc.) */
  layerClassName?: string
  /** Slightly smaller type for long secondary copy */
  secondaryClassName?: string
  /** Navigate on activate (renders a Link) */
  to?: string
  /** When set without `to`, renders a button */
  onActivate?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void
  /**
   * On coarse / no-hover pointers: first tap reveals secondary; second tap
   * runs the action. Desktop hover + click activates immediately.
   */
  requireRevealBeforeActivate?: boolean
  /**
   * Size to primary by default; animate width (and height when overlaying)
   * to the secondary size on hover/focus/reveal. Widths/heights are measured
   * in px so transitions stay reliable.
   */
  expandOnReveal?: boolean
  /**
   * When expanding, reserve only the compact (primary) size in layout and let
   * the face grow as an overlay. Prevents table row/column reflow when
   * secondary content is taller or wider (e.g. two-line lease details).
   */
  overlayExpand?: boolean
  /**
   * Cap expand width (and secondary measure max-width) so long reveal copy
   * wraps inside a tile instead of overflowing neighboring cards.
   */
  maxExpandWidth?: number | null
  /**
   * Rendered inside the expand host (after the face) so it can inherit size
   * CSS vars — e.g. a Notify action that tracks compact→full width.
   */
  trailing?: ReactNode
  /** Force the secondary face visible (e.g. demo nudge animation). */
  forceRevealed?: boolean
  disabled?: boolean
}

type ExpandSize = {
  compactW: number
  fullW: number
  compactH: number
  fullH: number
}

function prefersTouchReveal(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

/**
 * Compact status-box interaction: swap primary ↔ secondary text in place
 * (no floating tooltip). Grid-stacks both layers so the box keeps a stable size,
 * or optionally expands width/height to fit secondary on reveal.
 */
export function InPlaceHoverText({
  primary,
  secondary,
  ariaLabel,
  className,
  style,
  layerClassName,
  secondaryClassName,
  to,
  onActivate,
  requireRevealBeforeActivate = Boolean(to || onActivate),
  expandOnReveal = false,
  overlayExpand = false,
  maxExpandWidth = null,
  trailing,
  forceRevealed = false,
  disabled,
}: InPlaceHoverTextProps) {
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLElement | null>(null)
  const primaryMeasureRef = useRef<HTMLSpanElement | null>(null)
  const secondaryMeasureRef = useRef<HTMLSpanElement | null>(null)
  const [expandSize, setExpandSize] = useState<ExpandSize | null>(null)
  const isActionable = Boolean(to || onActivate)

  useLayoutEffect(() => {
    if (!expandOnReveal) {
      setExpandSize(null)
      return
    }

    const measure = () => {
      const primaryEl = primaryMeasureRef.current
      const secondaryEl = secondaryMeasureRef.current
      if (!primaryEl || !secondaryEl) return

      const cap =
        typeof maxExpandWidth === 'number' && maxExpandWidth > 0
          ? Math.floor(maxExpandWidth)
          : null
      if (cap) {
        secondaryEl.style.maxWidth = `${cap}px`
      } else {
        secondaryEl.style.maxWidth = ''
      }

      const compactW = Math.ceil(primaryEl.getBoundingClientRect().width)
      let fullW = Math.ceil(secondaryEl.getBoundingClientRect().width)
      const compactH = Math.ceil(primaryEl.getBoundingClientRect().height)
      const fullH = Math.ceil(secondaryEl.getBoundingClientRect().height)
      if (compactW <= 0 || fullW <= 0 || compactH <= 0 || fullH <= 0) return
      if (cap) fullW = Math.min(fullW, cap)

      setExpandSize((prev) => {
        const next: ExpandSize = {
          compactW,
          fullW: Math.max(compactW, fullW),
          compactH,
          fullH: Math.max(compactH, fullH),
        }
        if (
          prev &&
          prev.compactW === next.compactW &&
          prev.fullW === next.fullW &&
          prev.compactH === next.compactH &&
          prev.fullH === next.fullH
        ) {
          return prev
        }
        return next
      })
    }

    measure()

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measure())
        : null
    if (primaryMeasureRef.current) observer?.observe(primaryMeasureRef.current)
    if (secondaryMeasureRef.current) observer?.observe(secondaryMeasureRef.current)

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measure)
    }

    return () => observer?.disconnect()
  }, [
    expandOnReveal,
    overlayExpand,
    maxExpandWidth,
    primary,
    secondary,
    className,
    layerClassName,
    secondaryClassName,
  ])

  useEffect(() => {
    if (!revealed) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setRevealed(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [revealed])

  const showSecondary = revealed || forceRevealed
  const rootClassName = cn(
    'in-place-hover group/in-place relative inline-grid place-items-center items-center justify-items-center text-center',
    !expandOnReveal && 'max-w-full',
    expandOnReveal && 'in-place-hover--expand',
    expandOnReveal && expandSize && 'in-place-hover--expand-ready',
    expandOnReveal && overlayExpand && 'in-place-hover--overlay-expand',
    isActionable && 'in-place-hover--action',
    showSecondary && 'in-place-hover--revealed',
    className
  )

  const sizeVars: CSSProperties | null = expandSize
    ? ({
        '--in-place-compact-w': `${expandSize.compactW}px`,
        '--in-place-full-w': `${expandSize.fullW}px`,
        '--in-place-compact-h': `${expandSize.compactH}px`,
        '--in-place-full-h': `${expandSize.fullH}px`,
        // Legacy single-height var: reserve mode keeps face at the larger size.
        '--in-place-h': `${overlayExpand ? expandSize.compactH : expandSize.fullH}px`,
      } as CSSProperties)
    : null

  const expandStyle: CSSProperties | undefined = expandOnReveal
    ? { ...style, ...sizeVars }
    : style

  const handleActivate = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
  ): boolean => {
    if (disabled) {
      event.preventDefault()
      return false
    }

    if (requireRevealBeforeActivate && prefersTouchReveal() && !revealed) {
      event.preventDefault()
      event.stopPropagation()
      setRevealed(true)
      return false
    }

    onActivate?.(event)
    return true
  }

  const layerBase = cn(
    'in-place-hover__layer col-start-1 row-start-1 inline-flex items-center justify-center gap-0.5',
    !expandOnReveal && 'max-w-full',
    layerClassName
  )

  const layers = (
    <>
      <span
        aria-hidden={showSecondary || undefined}
        className={cn(layerBase, 'in-place-hover__layer--primary')}
      >
        {primary}
      </span>
      <span
        aria-hidden
        className={cn(
          layerBase,
          'in-place-hover__layer--secondary',
          expandOnReveal && 'in-place-hover__layer--secondary-expand',
          secondaryClassName
        )}
      >
        {secondary}
      </span>
    </>
  )

  const sharedProps = {
    'aria-label': ariaLabel,
    'data-revealed': showSecondary ? 'true' : undefined,
    className: rootClassName,
    style: expandStyle,
    onBlur: () => setRevealed(false),
    onMouseLeave: () => {
      if (!prefersTouchReveal()) setRevealed(false)
    },
  }

  let control: ReactNode
  if (to) {
    control = (
      <Link
        ref={rootRef as never}
        to={to}
        {...sharedProps}
        onClick={(event) => {
          handleActivate(event)
        }}
      >
        {layers}
      </Link>
    )
  } else if (onActivate) {
    control = (
      <button
        ref={rootRef as never}
        type="button"
        disabled={disabled}
        {...sharedProps}
        onClick={(event) => {
          handleActivate(event)
        }}
      >
        {layers}
      </button>
    )
  } else {
    control = (
      <span
        ref={rootRef as never}
        tabIndex={0}
        {...sharedProps}
        onClick={(event) => {
          if (!prefersTouchReveal()) return
          event.preventDefault()
          event.stopPropagation()
          setRevealed((prev) => !prev)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setRevealed(false)
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setRevealed((prev) => !prev)
          }
        }}
      >
        {layers}
      </span>
    )
  }

  if (!expandOnReveal) return control

  // Hidden full shells (padding/border included) for reliable px measurement.
  const measureShellClass = cn(
    className,
    'in-place-hover-expand-measure pointer-events-none'
  )

  return (
    <span
      className={cn(
        'in-place-hover-expand-host',
        overlayExpand && 'in-place-hover-expand-host--overlay'
      )}
      style={
        expandSize
          ? ({
              '--in-place-compact-w': `${expandSize.compactW}px`,
              '--in-place-full-w': `${expandSize.fullW}px`,
              '--in-place-compact-h': `${expandSize.compactH}px`,
              '--in-place-full-h': `${expandSize.fullH}px`,
              '--in-place-h': `${
                overlayExpand ? expandSize.compactH : expandSize.fullH
              }px`,
            } as CSSProperties)
          : undefined
      }
    >
      <span className="in-place-hover-expand-sizer" aria-hidden>
        <span
          ref={primaryMeasureRef}
          data-measure="primary"
          className={measureShellClass}
        >
          <span className={cn(layerBase, 'in-place-hover__layer--primary')}>
            {primary}
          </span>
        </span>
        <span
          ref={secondaryMeasureRef}
          data-measure="secondary"
          className={measureShellClass}
        >
          <span
            className={cn(
              layerBase,
              'in-place-hover__layer--secondary',
              secondaryClassName
            )}
          >
            {secondary}
          </span>
        </span>
      </span>
      {control}
      {trailing}
    </span>
  )
}
