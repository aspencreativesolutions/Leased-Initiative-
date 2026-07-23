import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Compass, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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

interface OnboardingTourProps {
  role: 'admin' | 'client'
  context?: OnboardingContext
  /** Force-show tour (e.g. user clicked "Take tour") */
  forceStart?: boolean
  onForceStartHandled?: () => void
}

const DEFAULT_ONBOARDING_CONTEXT: OnboardingContext = {}

const ADMIN_TOUR_STEP_KEY = 'leased-admin-tour-step-id'

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

function getTooltipPosition(
  rect: SpotlightRect | null,
  placement: OnboardingStep['placement']
) {
  const tooltipWidth = 320
  if (!rect) {
    return {
      top: 88,
      left: Math.max(16, (window.innerWidth - tooltipWidth) / 2),
    }
  }

  const margin = 12
  const centerX = rect.left + rect.width / 2

  if (placement === 'top') {
    return {
      top: Math.max(16, rect.top - margin),
      left: Math.min(
        window.innerWidth - tooltipWidth - 16,
        Math.max(16, centerX - tooltipWidth / 2)
      ),
      transform: 'translateY(-100%)',
    }
  }
  if (placement === 'left') {
    return {
      top: rect.top,
      left: Math.max(16, rect.left - margin),
      transform: 'translateX(-100%)',
    }
  }
  if (placement === 'right') {
    return {
      top: rect.top,
      left: Math.min(window.innerWidth - tooltipWidth - 16, rect.left + rect.width + margin),
    }
  }
  return {
    top: rect.top + rect.height + margin,
    left: Math.min(
      window.innerWidth - tooltipWidth - 16,
      Math.max(16, centerX - tooltipWidth / 2)
    ),
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
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const adminMode = isAdminModeEnabled()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [tourSteps, setTourSteps] = useState<OnboardingStep[]>([])
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const onForceStartHandledRef = useRef(onForceStartHandled)
  onForceStartHandledRef.current = onForceStartHandled

  const allSteps = role === 'admin' ? ADMIN_ONBOARDING_STEPS : CLIENT_ONBOARDING_STEPS

  const pendingSteps = useMemo(() => {
    if (!progress) return []
    return filterOnboardingSteps(allSteps, context, progress.completedSteps ?? [])
  }, [allSteps, context, progress])

  const currentStep = tourSteps[stepIndex] ?? null
  const currentSection = currentStep?.section

  const beginTour = useCallback(
    (steps: OnboardingStep[], preferredStepId?: string | null) => {
      if (steps.length === 0) return
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
    },
    [role]
  )

  const goToStepIndex = useCallback(
    (index: number) => {
      setStepIndex(index)
      const step = tourSteps[index]
      if (step) rememberStepId(step.id)
    },
    [tourSteps]
  )

  const refreshSpotlight = useCallback(() => {
    if (!currentStep) {
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
    fetchOnboardingProgress(role)
      .then(setProgress)
      .catch(() => setProgress({ completedSteps: [] }))
  }, [user, role])

  /** Manual restart from Tour button — re-sync progress after server reset */
  useEffect(() => {
    if (!forceStart) return
    let cancelled = false
    ;(async () => {
      let next: OnboardingProgress = { completedSteps: [] }
      try {
        next = await fetchOnboardingProgress(role)
      } catch {
        next = { completedSteps: [] }
      }
      if (cancelled) return
      setProgress(next)
      const steps = tourPathSteps(allSteps, context)
      beginTour(steps, readRememberedStepId())
      onForceStartHandledRef.current?.()
    })()
    return () => {
      cancelled = true
    }
  }, [forceStart, role, allSteps, context, beginTour])

  /** Auto-start for first-time users who have not dismissed (skip in admin/dev tooling mode) */
  useEffect(() => {
    if (adminMode || forceStart || active) return
    if (!progress || progress.dismissedAt) return
    if (pendingSteps.length === 0) return
    const steps = tourPathSteps(allSteps, context)
    const timer = setTimeout(() => beginTour(steps, pendingSteps[0]?.id), 800)
    return () => clearTimeout(timer)
  }, [
    progress,
    pendingSteps,
    forceStart,
    adminMode,
    active,
    beginTour,
    allSteps,
    context,
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
    const retry = setTimeout(refreshSpotlight, 400)
    const skipMissing = setTimeout(() => {
      const rect = getSpotlightRect(currentStep.target)
      if (!rect && stepIndex < tourSteps.length - 1) {
        goToStepIndex(stepIndex + 1)
      }
    }, 600)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      clearTimeout(retry)
      clearTimeout(skipMissing)
    }
  }, [
    active,
    currentStep,
    refreshSpotlight,
    location.pathname,
    stepIndex,
    tourSteps.length,
    goToStepIndex,
  ])

  const completeStep = useCallback(
    async (stepId: string) => {
      const next = await updateOnboardingProgress(role, { stepId, complete: true })
      setProgress(next)
      await refreshUser()
    },
    [role, refreshUser]
  )

  const handleNext = useCallback(async () => {
    if (!currentStep) return
    await completeStep(currentStep.id)
    if (stepIndex < tourSteps.length - 1) {
      goToStepIndex(stepIndex + 1)
    } else {
      setActive(false)
      setTourSteps([])
      rememberStepId(null)
    }
  }, [completeStep, currentStep, tourSteps.length, stepIndex, goToStepIndex])

  const handleDismiss = useCallback(async () => {
    const next = await updateOnboardingProgress(role, { dismiss: true })
    setProgress(next)
    setActive(false)
    setTourSteps([])
    rememberStepId(null)
    await refreshUser()
  }, [role, refreshUser])

  const handleJumpToSection = useCallback(
    (sectionId: AdminTourSectionId) => {
      const idx = tourSteps.findIndex((s) => s.section === sectionId)
      if (idx >= 0) goToStepIndex(idx)
    },
    [tourSteps, goToStepIndex]
  )

  if (!active || !currentStep) return null

  const tooltipStyle = getTooltipPosition(spotlight, currentStep.placement ?? 'bottom')
  const stepNumber = stepIndex + 1
  const totalSteps = tourSteps.length
  const showSectionNav = role === 'admin'

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="onboarding-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight ? (
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

      {spotlight ? (
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
        className="absolute w-80 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-surface-paper p-4 shadow-lift"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          transform: tooltipStyle.transform,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 shrink-0 text-brand" />
            <p className="text-[10px] font-bold uppercase tracking-caps text-brand">
              Step {stepNumber} of {totalSteps}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-sm p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="font-display text-lg font-semibold text-ink">{currentStep.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{currentStep.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Skip tour
          </button>
          <Button size="sm" onClick={handleNext}>
            {stepIndex < tourSteps.length - 1 ? 'Next' : 'Done'}
          </Button>
        </div>
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
  const handleClick = async () => {
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
