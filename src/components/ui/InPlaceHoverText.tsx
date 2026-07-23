import {
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
   * Size to primary by default; animate width to fill a host reserved for the
   * longer of primary/secondary on hover/focus/reveal. Uses a hidden CSS sizer
   * (no JS pixel measurement). Secondary fades in after width expands so labels
   * stay fully visible and centered — never clipped.
   */
  expandOnReveal?: boolean
  disabled?: boolean
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
 * or optionally expands width to fit secondary on reveal.
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
  disabled,
}: InPlaceHoverTextProps) {
  const [revealed, setRevealed] = useState(false)
  const rootRef = useRef<HTMLElement | null>(null)
  const isActionable = Boolean(to || onActivate)

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

  const showSecondary = revealed
  const rootClassName = cn(
    'in-place-hover group/in-place relative inline-grid place-items-center items-center justify-items-center text-center',
    !expandOnReveal && 'max-w-full',
    expandOnReveal && 'in-place-hover--expand',
    isActionable && 'in-place-hover--action',
    showSecondary && 'in-place-hover--revealed',
    className
  )

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
    style,
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

  // Hidden sizer: stacked full shells so the host is intrinsically as wide as
  // the longer label (padding/border included). Visible tag grows to 100% on
  // hover — no JS measurement, so text cannot clip from undersized pixels.
  const sizerShellClass = cn(
    rootClassName,
    'in-place-hover-expand-sizer__shell pointer-events-none'
  )

  return (
    <span className="in-place-hover-expand-host">
      <span className="in-place-hover-expand-sizer" aria-hidden>
        <span className={sizerShellClass}>
          <span className={cn(layerBase, 'in-place-hover__layer--primary')}>
            {primary}
          </span>
        </span>
        <span className={sizerShellClass}>
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
    </span>
  )
}
