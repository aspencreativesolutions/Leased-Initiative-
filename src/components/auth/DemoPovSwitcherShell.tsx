import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ArrowLeftRight, ChevronDown } from 'lucide-react'
import {
  hasPlayedDemoPovIntro,
  markDemoPovIntroPlayed,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

const ATTENTION_MS = 2600
const ATTENTION_REDUCED_MS = 900
const REMINDER_INTERVAL_MS = 45_000
const REMINDER_ATTENTION_MS = 2800
const REMINDER_ATTENTION_REDUCED_MS = 900

type DemoPovSwitcherShellProps = {
  title?: string
  subtitle: ReactNode
  action: ReactNode
  /** Extra content between subtitle and action (e.g. error). */
  children?: ReactNode
  className?: string
  /** When true, force-collapse after a successful POV action from the parent. */
  collapseSignal?: number
}

/**
 * Bottom-right Switch POV chrome: expands on first demo entry with a brief
 * attention cue, then collapses to a compact tab for the rest of the session.
 */
export function DemoPovSwitcherShell({
  title = 'Choose a role to start your demo.',
  subtitle,
  action,
  children,
  className,
  collapseSignal = 0,
}: DemoPovSwitcherShellProps) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(() => !hasPlayedDemoPovIntro())
  const [attention, setAttention] = useState(() => !hasPlayedDemoPovIntro())
  const [reminderPulse, setReminderPulse] = useState(false)

  const finishIntro = useCallback(() => {
    markDemoPovIntroPlayed()
    setAttention(false)
  }, [])

  const collapse = useCallback(() => {
    finishIntro()
    setExpanded(false)
    setReminderPulse(false)
  }, [finishIntro])

  const expand = useCallback(() => {
    finishIntro()
    setExpanded(true)
    setReminderPulse(false)
  }, [finishIntro])

  useEffect(() => {
    if (!attention) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => {
        finishIntro()
        setExpanded(false)
      },
      reduced ? ATTENTION_REDUCED_MS : ATTENTION_MS
    )
    return () => window.clearTimeout(timer)
  }, [attention, finishIntro])

  /** Periodic nudge so visitors remember they can switch landlord/tenant POV. */
  useEffect(() => {
    if (attention) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let pulseTimer: number | undefined
    const interval = window.setInterval(() => {
      setReminderPulse(true)
      window.clearTimeout(pulseTimer)
      pulseTimer = window.setTimeout(
        () => setReminderPulse(false),
        reduced ? REMINDER_ATTENTION_REDUCED_MS : REMINDER_ATTENTION_MS
      )
    }, REMINDER_INTERVAL_MS)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(pulseTimer)
    }
  }, [attention])

  useEffect(() => {
    if (collapseSignal > 0) collapse()
  }, [collapseSignal, collapse])

  useEffect(() => {
    if (!expanded) return
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root || root.contains(event.target as Node)) return
      collapse()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') collapse()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [expanded, collapse])

  if (!expanded) {
    return (
      <div
        ref={rootRef}
        className={cn('fixed bottom-4 right-4 z-[80] sm:bottom-5 sm:right-5', className)}
      >
        <button
          type="button"
          onClick={expand}
          className={cn(
            'demo-pov-switcher-tab flex items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-surface-paper px-3 py-2 text-xs font-semibold text-ink shadow-lift transition hover:border-brand hover:text-brand',
            reminderPulse && 'demo-pov-switcher-tab--reminder'
          )}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label="Demo mode controls"
          title="Demo mode controls"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Switch POV</span>
          <span className="sm:hidden">POV</span>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      id={panelId}
      role="dialog"
      aria-label="Demo mode controls"
      aria-modal="false"
      className={cn(
        'demo-pov-switcher fixed bottom-4 right-4 z-[80] w-[min(calc(100vw-2rem),15.5rem)] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-3 shadow-lift sm:bottom-5 sm:right-5 sm:p-3.5',
        attention && 'demo-pov-switcher--attention',
        reminderPulse && 'demo-pov-switcher--reminder',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="heading-display min-w-0 flex-1 text-sm leading-snug text-ink sm:text-[0.9375rem]">
          {title}
        </p>
        <button
          type="button"
          onClick={collapse}
          className="shrink-0 rounded-[var(--radius-sm)] p-0.5 text-ink-muted transition-colors hover:text-ink"
          aria-label="Collapse point of view switcher"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">{subtitle}</p>
      {children}
      <div className="mt-2.5">{action}</div>
    </div>
  )
}
