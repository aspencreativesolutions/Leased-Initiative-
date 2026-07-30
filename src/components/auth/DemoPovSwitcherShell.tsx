import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ArrowLeftRight, ChevronDown, Loader2, LogOut } from 'lucide-react'
import {
  hasPlayedDemoPovIntro,
  markDemoPovIntroPlayed,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

const ATTENTION_MS = 3800
const ATTENTION_REDUCED_MS = 1200
const REMINDER_INTERVAL_MS = 45_000
const REMINDER_ATTENTION_MS = 2800
const REMINDER_ATTENTION_REDUCED_MS = 900
/** Soft expand into the full panel. */
const EXPAND_MS = 560
const EXPAND_REDUCED_MS = 1
/** Gentle settle into the compact tab — slightly longer than expand. */
const COLLAPSE_MS = 640
const COLLAPSE_REDUCED_MS = 1

type Phase = 'closed' | 'opening' | 'open' | 'closing'

type DemoPovSwitcherShellProps = {
  title?: string
  subtitle: ReactNode
  action: ReactNode
  /** Extra content between subtitle and action (e.g. error). */
  children?: ReactNode
  className?: string
  /** When true, force-collapse after a successful POV action from the parent. */
  collapseSignal?: number
  /** Increment to expand + replay the attention animation (e.g. post-apply tip). */
  attentionSignal?: number
  /** Always-available exit from collapsed or expanded chrome. */
  onExit?: () => void
  exitBusy?: boolean
  exitDisabled?: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Bottom-right Switch POV chrome: expands on first demo entry with a brief
 * attention cue, then collapses to a compact tab for the rest of the session.
 * Exit stays available when collapsed so visitors can leave anytime.
 */
export function DemoPovSwitcherShell({
  title = 'Choose a role to start your demo.',
  subtitle,
  action,
  children,
  className,
  collapseSignal = 0,
  attentionSignal = 0,
  onExit,
  exitBusy = false,
  exitDisabled = false,
}: DemoPovSwitcherShellProps) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>(() =>
    hasPlayedDemoPovIntro() ? 'closed' : 'open'
  )
  const [attention, setAttention] = useState(() => !hasPlayedDemoPovIntro())
  const [reminderPulse, setReminderPulse] = useState(false)
  const [tabEntering, setTabEntering] = useState(() => hasPlayedDemoPovIntro())
  const lastAttentionSignal = useRef(0)
  const pendingAttention = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const finishIntro = useCallback(() => {
    markDemoPovIntroPlayed()
    setAttention(false)
    pendingAttention.current = false
  }, [])

  const collapse = useCallback(() => {
    finishIntro()
    setReminderPulse(false)
    setPhase((prev) => (prev === 'closed' || prev === 'closing' ? prev : 'closing'))
  }, [finishIntro])

  const expand = useCallback(() => {
    finishIntro()
    setReminderPulse(false)
    setPhase((prev) => (prev === 'open' || prev === 'opening' ? prev : 'opening'))
  }, [finishIntro])

  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return
    const reduced = prefersReducedMotion()
    const ms =
      phase === 'opening'
        ? reduced
          ? EXPAND_REDUCED_MS
          : EXPAND_MS
        : reduced
          ? COLLAPSE_REDUCED_MS
          : COLLAPSE_MS
    const timer = window.setTimeout(() => {
      if (phase === 'opening') {
        setPhase('open')
        return
      }
      setTabEntering(true)
      setPhase('closed')
    }, ms)
    return () => window.clearTimeout(timer)
  }, [phase])

  /** Clear the one-shot tab settle class after it finishes. */
  useEffect(() => {
    if (phase !== 'closed' || !tabEntering) return
    const reduced = prefersReducedMotion()
    const timer = window.setTimeout(() => setTabEntering(false), reduced ? 1 : 420)
    return () => window.clearTimeout(timer)
  }, [phase, tabEntering])

  /** Run the attention cue after expand settles so the two animations do not clash. */
  useEffect(() => {
    if (phase !== 'open' || !pendingAttention.current) return
    pendingAttention.current = false
    setAttention(true)
  }, [phase])

  useEffect(() => {
    if (!attention) return
    const reduced = prefersReducedMotion()
    const timer = window.setTimeout(
      () => {
        finishIntro()
        setPhase((prev) => (prev === 'closed' || prev === 'closing' ? prev : 'closing'))
      },
      reduced ? ATTENTION_REDUCED_MS : ATTENTION_MS
    )
    return () => window.clearTimeout(timer)
  }, [attention, finishIntro])

  /** Periodic nudge so visitors remember they can switch landlord/tenant POV. */
  useEffect(() => {
    if (attention) return
    const reduced = prefersReducedMotion()
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
    if (attentionSignal <= 0 || attentionSignal === lastAttentionSignal.current) return
    lastAttentionSignal.current = attentionSignal
    setReminderPulse(false)

    const current = phaseRef.current
    if (current === 'closed' || current === 'closing') {
      pendingAttention.current = true
      setPhase('opening')
      return
    }
    if (current === 'opening') {
      pendingAttention.current = true
      return
    }

    // Panel already open — restart the attention cue after a frame so the class re-applies.
    setAttention(false)
    window.requestAnimationFrame(() => setAttention(true))
  }, [attentionSignal])

  const panelInteractive = phase === 'open' || phase === 'opening'

  useEffect(() => {
    if (!panelInteractive) return
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
  }, [panelInteractive, collapse])

  if (phase === 'closed') {
    return (
      <div
        ref={rootRef}
        className={cn(
          'fixed bottom-4 right-4 z-[80] flex items-center gap-2 sm:bottom-5 sm:right-5',
          className
        )}
      >
        <button
          type="button"
          onClick={expand}
          className={cn(
            'demo-pov-switcher-tab flex items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-surface-paper px-3 py-2 text-xs font-semibold text-ink shadow-lift transition hover:border-brand hover:text-brand',
            tabEntering && 'demo-pov-switcher-tab--enter',
            reminderPulse && 'demo-pov-switcher-tab--reminder'
          )}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label="Switch demo point of view"
          title="Switch demo point of view"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Switch POV</span>
          <span className="sm:hidden">POV</span>
        </button>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            disabled={exitDisabled || exitBusy}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-ink px-3 py-2 text-xs font-semibold text-surface shadow-lift transition hover:bg-ink/90 disabled:opacity-50"
            aria-label="Exit Demo"
            title="Exit Demo"
          >
            {exitBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="hidden sm:inline">Exit</span>
          </button>
        ) : null}
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
        'demo-pov-switcher fixed bottom-4 right-4 z-[80] w-[min(calc(100vw-2rem),16.5rem)] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-3 shadow-lift sm:bottom-5 sm:right-5 sm:p-3.5',
        phase === 'opening' && 'demo-pov-switcher--expanding',
        phase === 'closing' && 'demo-pov-switcher--collapsing',
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
          disabled={phase === 'closing'}
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
