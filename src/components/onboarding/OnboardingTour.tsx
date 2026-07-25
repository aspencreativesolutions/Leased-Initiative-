import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isAdminModeEnabled } from '@/lib/adminMode'
import {
  fetchOnboardingProgress,
  updateOnboardingProgress,
} from '@/lib/onboardingApi'
import {
  ADMIN_ONBOARDING_STEPS,
  ADMIN_TOUR_SECTIONS,
  CLIENT_ONBOARDING_STEPS,
  filterOnboardingSteps,
  type AdminTourSectionId,
  type OnboardingContext,
  type OnboardingStep,
} from '@/lib/onboardingSteps'
import { NAV_TOOLBAR_ICON_BUTTON_CLASS } from '@/lib/navToolbar'
import { cn } from '@/lib/utils'
import type { OnboardingProgress } from '@/types'

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipStyle {
  top: number
  left: number
  transform?: string
}

interface OnboardingTourProps {
  role: 'admin' | 'client'
  context?: OnboardingContext
  /** Force-show tour (e.g. user clicked "Take tour") */
  forceStart?: boolean
  onForceStartHandled?: () => void
}

const DEFAULT_ONBOARDING_CONTEXT: OnboardingContext = {}

const ADMIN_TOUR_STEP_KEY = 'leased-admin-tour-step-id'
/** Survives refresh until the user explicitly restarts via the Tour button. */
const TOUR_DISMISSED_KEY = 'leased-onboarding-tour-dismissed'
const TOOLTIP_WIDTH = 320
const TOOLTIP_FALLBACK_HEIGHT = 220
const VIEWPORT_PAD = 16
const SPOTLIGHT_GAP = 12

function dismissedStorageKey(role: 'admin' | 'client', userId?: string | null) {
  return userId
    ? `${TOUR_DISMISSED_KEY}:${role}:${userId}`
    : `${TOUR_DISMISSED_KEY}:${role}`
}

function readLocalDismissed(role: 'admin' | 'client', userId?: string | null): boolean {
  try {
    return localStorage.getItem(dismissedStorageKey(role, userId)) === '1'
  } catch {
    return false
  }
}

function writeLocalDismissed(
  role: 'admin' | 'client',
  dismissed: boolean,
  userId?: string | null
) {
  try {
    const key = dismissedStorageKey(role, userId)
    if (dismissed) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

const NAV_ARROW_CLASS =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-[length:var(--border-width)] border-brand bg-brand text-white transition-colors hover:bg-brand-light hover:border-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35'

function getSpotlightRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const pad = 8
  return {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Place the description box near the spotlight without covering it when possible. */
function getTooltipPosition(
  rect: SpotlightRect | null,
  preferred: OnboardingStep['placement'],
  tooltipSize: { width: number; height: number }
): TooltipStyle {
  const width = tooltipSize.width || TOOLTIP_WIDTH
  const height = tooltipSize.height || TOOLTIP_FALLBACK_HEIGHT
  const maxLeft = Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD)
  const maxTop = Math.max(VIEWPORT_PAD, window.innerHeight - height - VIEWPORT_PAD)

  if (!rect) {
    return {
      top: Math.max(VIEWPORT_PAD, 88),
      left: clamp((window.innerWidth - width) / 2, VIEWPORT_PAD, maxLeft),
    }
  }

  const centerX = rect.left + rect.width / 2
  const spaceBelow = window.innerHeight - (rect.top + rect.height) - VIEWPORT_PAD
  const spaceAbove = rect.top - VIEWPORT_PAD
  const spaceRight = window.innerWidth - (rect.left + rect.width) - VIEWPORT_PAD
  const spaceLeft = rect.left - VIEWPORT_PAD

  const candidates: OnboardingStep['placement'][] = [
    preferred ?? 'bottom',
    'bottom',
    'top',
    'right',
    'left',
  ]
  const order = candidates.filter(
    (placement, index) => candidates.indexOf(placement) === index
  )

  const fits = (placement: NonNullable<OnboardingStep['placement']>) => {
    if (placement === 'bottom') return spaceBelow >= height + SPOTLIGHT_GAP
    if (placement === 'top') return spaceAbove >= height + SPOTLIGHT_GAP
    if (placement === 'right') return spaceRight >= width + SPOTLIGHT_GAP
    return spaceLeft >= width + SPOTLIGHT_GAP
  }

  const placement = order.find((p) => p && fits(p)) ?? (spaceBelow >= spaceAbove ? 'bottom' : 'top')

  if (placement === 'top') {
    return {
      top: clamp(rect.top - SPOTLIGHT_GAP - height, VIEWPORT_PAD, maxTop),
      left: clamp(centerX - width / 2, VIEWPORT_PAD, maxLeft),
    }
  }
  if (placement === 'left') {
    return {
      top: clamp(rect.top, VIEWPORT_PAD, maxTop),
      left: clamp(rect.left - SPOTLIGHT_GAP - width, VIEWPORT_PAD, maxLeft),
    }
  }
  if (placement === 'right') {
    return {
      top: clamp(rect.top, VIEWPORT_PAD, maxTop),
      left: clamp(rect.left + rect.width + SPOTLIGHT_GAP, VIEWPORT_PAD, maxLeft),
    }
  }
  return {
    top: clamp(rect.top + rect.height + SPOTLIGHT_GAP, VIEWPORT_PAD, maxTop),
    left: clamp(centerX - width / 2, VIEWPORT_PAD, maxLeft),
  }
}

function readRememberedStepId(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOUR_STEP_KEY)
  } catch {
    return null
  }
}

function rememberStepId(stepId: string | null) {
  try {
    if (stepId) sessionStorage.setItem(ADMIN_TOUR_STEP_KEY, stepId)
    else sessionStorage.removeItem(ADMIN_TOUR_STEP_KEY)
  } catch {
    /* ignore */
  }
}

/** Steps eligible for the tour path (when-guards only — completed steps stay so users can skip around). */
function tourPathSteps(steps: OnboardingStep[], context: OnboardingContext) {
  return steps.filter((step) => !step.when || step.when(context))
}

export function OnboardingTour({
  role,
  context = DEFAULT_ONBOARDING_CONTEXT,
  forceStart,
  onForceStartHandled,
}: OnboardingTourProps) {
  const { user, refreshUser, isPublicDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const adminMode = isAdminModeEnabled()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [tourSteps, setTourSteps] = useState<OnboardingStep[]>([])
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltipSize, setTooltipSize] = useState({
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_FALLBACK_HEIGHT,
  })
  const tooltipRef = useRef<HTMLDivElement>(null)
  /**
   * Once the user exits (or finishes), stay closed until they click Tour.
   * Never cleared by auto-start — only by the explicit restart path.
   */
  const optedOutRef = useRef(false)
  const onForceStartHandledRef = useRef(onForceStartHandled)
  onForceStartHandledRef.current = onForceStartHandled

  const allSteps = role === 'admin' ? ADMIN_ONBOARDING_STEPS : CLIENT_ONBOARDING_STEPS
  const userId = user?.id ?? null

  const pendingSteps = useMemo(() => {
    if (!progress) return []
    return filterOnboardingSteps(allSteps, context, progress.completedSteps ?? [])
  }, [allSteps, context, progress])

  const currentStep = tourSteps[stepIndex] ?? null
  const currentSection = currentStep?.section
  const isFirstStep = stepIndex <= 0
  const isLastStep = stepIndex >= tourSteps.length - 1
  const isCompletionStep = Boolean(currentStep?.completion)

  const isOptedOut = useCallback(() => {
    return (
      optedOutRef.current ||
      Boolean(progress?.dismissedAt) ||
      readLocalDismissed(role, userId)
    )
  }, [progress?.dismissedAt, role, userId])

  const markTourDismissed = useCallback(() => {
    optedOutRef.current = true
    writeLocalDismissed(role, true, userId)
  }, [role, userId])

  const clearTourDismissed = useCallback(() => {
    optedOutRef.current = false
    writeLocalDismissed(role, false, userId)
  }, [role, userId])

  const beginTour = useCallback(
    (steps: OnboardingStep[], preferredStepId?: string | null) => {
      if (steps.length === 0) return
      // Do NOT clear opted-out here — auto-start must never undo Exit Tour.
      const remembered = preferredStepId ?? (role === 'admin' ? readRememberedStepId() : null)
      let index = 0
      if (remembered) {
        const found = steps.findIndex((s) => s.id === remembered)
        if (found >= 0) index = found
      }
      setTourSteps(steps)
      setStepIndex(index)
      setActive(true)
      rememberStepId(steps[index]?.id ?? null)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    },
    [role]
  )

  const goToStepIndex = useCallback(
    (index: number) => {
      setStepIndex(index)
      const step = tourSteps[index]
      if (step) rememberStepId(step.id)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    },
    [tourSteps]
  )

  const refreshSpotlight = useCallback(() => {
    if (!currentStep || currentStep.completion) {
      setSpotlight(null)
      return
    }
    const rect = getSpotlightRect(currentStep.target)
    setSpotlight(rect)
    if (rect) {
      const el = document.querySelector(currentStep.target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [currentStep])

  useEffect(() => {
    if (!user) return
    // Hydrate opted-out from durable local flag (per user) as soon as we know who they are.
    if (readLocalDismissed(role, user.id)) {
      optedOutRef.current = true
    }
    let cancelled = false
    fetchOnboardingProgress(role)
      .then((next) => {
        if (cancelled) return
        setProgress((prev) => {
          // Never let a stale fetch wipe an Exit / finish.
          if (optedOutRef.current || prev?.dismissedAt || next.dismissedAt) {
            if (next.dismissedAt || prev?.dismissedAt) {
              optedOutRef.current = true
              writeLocalDismissed(role, true, user.id)
            }
            return {
              ...next,
              dismissedAt:
                prev?.dismissedAt ?? next.dismissedAt ?? new Date().toISOString(),
              completedAt: prev?.completedAt ?? next.completedAt,
            }
          }
          return next
        })
      })
      .catch(() => {
        if (cancelled) return
        setProgress((prev) => prev ?? { completedSteps: [] })
      })
    return () => {
      cancelled = true
    }
  }, [user, role])

  const allStepsRef = useRef(allSteps)
  allStepsRef.current = allSteps
  const contextRef = useRef(context)
  contextRef.current = context
  const beginTourRef = useRef(beginTour)
  beginTourRef.current = beginTour
  const clearTourDismissedRef = useRef(clearTourDismissed)
  clearTourDismissedRef.current = clearTourDismissed

  /** Manual restart from Tour button — only path that clears Exit and reopens the tour */
  useEffect(() => {
    if (!forceStart) return
    let cancelled = false
    clearTourDismissedRef.current()
    const stepsSnapshot = tourPathSteps(allStepsRef.current, contextRef.current)
    ;(async () => {
      try {
        await fetchOnboardingProgress(role)
      } catch {
        /* offline — still allow a local restart */
      }
      if (cancelled) return
      setProgress({ completedSteps: [] })
      beginTourRef.current(stepsSnapshot, null)
      onForceStartHandledRef.current?.()
    })()
    return () => {
      cancelled = true
    }
  }, [forceStart, role])

  /** Auto-start once for first-time users who have never exited or finished */
  useEffect(() => {
    if (adminMode || forceStart || active) return
    if (optedOutRef.current || isOptedOut()) return
    if (!progress) return
    if (progress.dismissedAt || progress.completedAt) {
      optedOutRef.current = true
      writeLocalDismissed(role, true, userId)
      return
    }
    if (pendingSteps.length === 0) return
    const steps = tourPathSteps(allSteps, context)
    const firstPendingId = pendingSteps[0]?.id
    const timer = window.setTimeout(() => {
      // Re-check the durable latch — Exit may have happened while we waited.
      if (optedOutRef.current || readLocalDismissed(role, userId)) return
      beginTour(steps, firstPendingId)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [
    progress,
    pendingSteps,
    forceStart,
    adminMode,
    active,
    beginTour,
    allSteps,
    context,
    role,
    userId,
    isOptedOut,
  ])

  useEffect(() => {
    if (!active || !currentStep?.route) return
    const [routePath, routeQuery] = currentStep.route.split('?')
    const routeSearch = routeQuery != null ? `?${routeQuery}` : null
    const pathMismatch = location.pathname !== routePath
    const searchMismatch = routeSearch != null && location.search !== routeSearch
    if (pathMismatch || searchMismatch) {
      navigate(currentStep.route)
    }
  }, [active, currentStep, location.pathname, location.search, navigate])

  useLayoutEffect(() => {
    if (!active || !currentStep) return
    refreshSpotlight()
    const onResize = () => refreshSpotlight()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    const retryTimers = [200, 400, 800, 1200].map((ms) =>
      setTimeout(refreshSpotlight, ms)
    )
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      retryTimers.forEach(clearTimeout)
    }
  }, [active, currentStep, refreshSpotlight, location.pathname, location.search])

  useLayoutEffect(() => {
    if (!active || !tooltipRef.current) return
    const measure = () => {
      const node = tooltipRef.current
      if (!node) return
      const { width, height } = node.getBoundingClientRect()
      setTooltipSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tooltipRef.current)
    return () => observer.disconnect()
  }, [active, currentStep, stepIndex])

  const completeStep = useCallback(
    async (stepId: string) => {
      try {
        const next = await updateOnboardingProgress(role, { stepId, complete: true })
        setProgress((prev) => ({
          ...next,
          // Keep a local dismiss if a concurrent complete response races ahead of dismiss.
          dismissedAt: prev?.dismissedAt ?? next.dismissedAt,
          completedAt: prev?.completedAt ?? next.completedAt,
        }))
        if (!optedOutRef.current) {
          await refreshUser()
        }
      } catch (err) {
        // Tour navigation must not freeze if the progress API is slow or offline.
        console.warn('onboarding progress save failed', err)
      }
    },
    [role, refreshUser]
  )

  const endTour = useCallback(() => {
    setActive(false)
    setTourSteps([])
    setSpotlight(null)
    rememberStepId(null)
  }, [])

  /** Close the tour immediately and permanently (Exit or finish). Persist dismiss in background. */
  const finishTour = useCallback(() => {
    markTourDismissed()
    const now = new Date().toISOString()
    setProgress((prev) => ({
      completedSteps: prev?.completedSteps ?? [],
      completedAt: prev?.completedAt ?? now,
      dismissedAt: prev?.dismissedAt ?? now,
    }))
    endTour()
    void updateOnboardingProgress(role, { dismiss: true })
      .then(async (next) => {
        setProgress((prev) => ({
          ...next,
          dismissedAt: next.dismissedAt ?? prev?.dismissedAt ?? now,
          completedAt: next.completedAt ?? prev?.completedAt ?? now,
        }))
        try {
          await refreshUser()
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        console.warn('onboarding dismiss save failed', err)
      })
  }, [role, refreshUser, endTour, markTourDismissed])

  const handleNext = useCallback(() => {
    if (!currentStep) return
    const stepId = currentStep.id
    const atEnd = stepIndex >= tourSteps.length - 1
    if (atEnd) {
      // Mark final step complete, then permanently close — never leave pending auto-start.
      void completeStep(stepId)
      finishTour()
      return
    }
    goToStepIndex(stepIndex + 1)
    void completeStep(stepId)
  }, [completeStep, currentStep, tourSteps.length, stepIndex, goToStepIndex, finishTour])

  const handleBack = useCallback(() => {
    if (stepIndex <= 0) return
    goToStepIndex(stepIndex - 1)
  }, [stepIndex, goToStepIndex])

  const handleDismiss = useCallback(
    (event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      event?.preventDefault?.()
      event?.stopPropagation?.()
      finishTour()
    },
    [finishTour]
  )

  const handleJumpToSection = useCallback(
    (sectionId: AdminTourSectionId) => {
      const idx = tourSteps.findIndex((s) => s.section === sectionId)
      if (idx >= 0) goToStepIndex(idx)
    },
    [tourSteps, goToStepIndex]
  )

  useEffect(() => {
    if (!active) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        handleNext()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        handleBack()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        handleDismiss()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, handleNext, handleBack, handleDismiss])

  if (!active || !currentStep) return null

  const tooltipStyle = isCompletionStep
    ? {
        top: Math.max(VIEWPORT_PAD, (window.innerHeight - tooltipSize.height) / 2),
        left: clamp(
          (window.innerWidth - TOOLTIP_WIDTH) / 2,
          VIEWPORT_PAD,
          Math.max(VIEWPORT_PAD, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PAD)
        ),
      }
    : getTooltipPosition(spotlight, currentStep.placement ?? 'bottom', tooltipSize)
  const stepNumber = stepIndex + 1
  const totalSteps = tourSteps.length
  const showSectionNav = role === 'admin' && !isCompletionStep
  const continueLabel =
    isPublicDemo || user?.publicDemo ? 'Continue to manual demo' : 'Continue exploring'
  const tooltipPositionStyle: CSSProperties = {
    top: tooltipStyle.top,
    left: tooltipStyle.left,
    width: isCompletionStep ? Math.min(TOOLTIP_WIDTH + 40, window.innerWidth - VIEWPORT_PAD * 2) : TOOLTIP_WIDTH,
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="onboarding-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && !isCompletionStep ? (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx="6"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.55)"
          mask="url(#onboarding-spotlight-mask)"
        />
      </svg>

      {/* Dimmed overlay catch — SVG cannot reliably receive clicks above siblings */}
      <div
        className="pointer-events-auto absolute inset-0 z-0"
        aria-hidden
        onClick={handleDismiss}
      />

      {showSectionNav ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[101] flex justify-center px-3 pt-3 sm:pt-4">
          <nav
            className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-surface-paper p-1.5 shadow-lift"
            aria-label="Tour sections"
          >
            {ADMIN_TOUR_SECTIONS.map(({ id, label }) => {
              const available = tourSteps.some((s) => s.section === id)
              const isCurrent = currentSection === id
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!available}
                  onClick={() => handleJumpToSection(id)}
                  className={cn(
                    'rounded-[calc(var(--radius-sm)-2px)] px-2 py-1.5 text-[10px] font-semibold transition-colors sm:px-2.5 sm:text-[11px]',
                    isCurrent
                      ? 'bg-brand text-white'
                      : available
                        ? 'text-ink-muted hover:bg-surface hover:text-ink'
                        : 'cursor-not-allowed text-ink-faint'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </nav>
        </div>
      ) : null}

      {spotlight && !isCompletionStep ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-md)] border-[length:var(--border-width)] border-brand shadow-[0_0_0_4px_rgba(30,77,107,0.25)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : null}

      <div
        ref={tooltipRef}
        className={cn(
          'pointer-events-auto absolute z-[102] rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-surface-paper p-4 shadow-lift',
          isCompletionStep ? 'w-[min(22.5rem,calc(100vw-2rem))] p-5 text-center sm:p-6' : 'w-80'
        )}
        style={tooltipPositionStyle}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            'mb-2 flex items-center gap-2',
            isCompletionStep && 'justify-center'
          )}
        >
          <Compass className="h-4 w-4 shrink-0 text-brand" />
          <p className="text-[10px] font-bold uppercase tracking-caps text-brand">
            {isCompletionStep
              ? 'All done'
              : isLastStep
                ? 'Final step'
                : `Step ${stepNumber} of ${totalSteps}`}
          </p>
        </div>

        <h3
          className={cn(
            'font-display font-semibold text-ink',
            isCompletionStep ? 'text-xl' : 'text-lg'
          )}
        >
          {currentStep.title}
        </h3>
        <p
          className={cn(
            'mt-2 text-sm leading-relaxed text-ink-muted',
            isCompletionStep && 'mx-auto max-w-[18rem]'
          )}
        >
          {currentStep.description}
        </p>

        {isLastStep ? (
          <div className={cn('mt-4 space-y-3', isCompletionStep && 'space-y-4')}>
            <button
              type="button"
              onClick={handleNext}
              className="tour-continue-demo-btn w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {continueLabel}
            </button>
            {!isCompletionStep ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="relative z-[1] -ml-1 rounded-[var(--radius-sm)] px-1 py-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                >
                  Exit Tour
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFirstStep}
                  className={NAV_ARROW_CLASS}
                  aria-label="Previous tour step"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                >
                  Exit Tour
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFirstStep}
                  className="text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                >
                  Back to last tip
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="relative z-[1] -ml-1 rounded-[var(--radius-sm)] px-1 py-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              Exit Tour
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep}
                className={NAV_ARROW_CLASS}
                aria-label="Previous tour step"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={NAV_ARROW_CLASS}
                aria-label="Next tour step"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Icon button matching Settings — restarts the guided tour */
export function OnboardingRestartButton({
  role,
  onStart,
  className,
}: {
  role: 'admin' | 'client'
  onStart: () => void
  className?: string
}) {
  const { user } = useAuth()

  const handleClick = async () => {
    // Clear both legacy role-only and per-user dismiss latches.
    writeLocalDismissed(role, false, null)
    writeLocalDismissed(role, false, user?.id ?? null)
    await updateOnboardingProgress(role, { reset: true })
    rememberStepId(null)
    onStart()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(NAV_TOOLBAR_ICON_BUTTON_CLASS, className)}
      data-tooltip="Take the tour"
      aria-label="Take the tour"
    >
      <Compass className="h-3.5 w-3.5" />
    </button>
  )
}
