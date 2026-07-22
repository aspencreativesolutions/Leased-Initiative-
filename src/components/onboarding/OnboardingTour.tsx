import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
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
  CLIENT_ONBOARDING_STEPS,
  filterOnboardingSteps,
  type OnboardingContext,
  type OnboardingStep,
} from '@/lib/onboardingSteps'
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
  rect: SpotlightRect,
  placement: OnboardingStep['placement']
) {
  const margin = 12
  const tooltipWidth = 320
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

export function OnboardingTour({
  role,
  context = {},
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
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)

  const allSteps = role === 'admin' ? ADMIN_ONBOARDING_STEPS : CLIENT_ONBOARDING_STEPS

  const pendingSteps = useMemo(() => {
    if (!progress) return []
    return filterOnboardingSteps(allSteps, context, progress.completedSteps ?? [])
  }, [allSteps, context, progress])

  const currentStep = pendingSteps[stepIndex] ?? null

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
    if (adminMode) {
      setActive(false)
      setProgress(null)
      return
    }
    if (!user) return
    fetchOnboardingProgress(role)
      .then(setProgress)
      .catch(() => setProgress({ completedSteps: [] }))
  }, [user, role, adminMode])

  useEffect(() => {
    if (adminMode) return
    if (!progress || progress.dismissedAt) return
    if (pendingSteps.length === 0) return
    if (forceStart) {
      setActive(true)
      setStepIndex(0)
      onForceStartHandled?.()
      return
    }
    const timer = setTimeout(() => setActive(true), 800)
    return () => clearTimeout(timer)
  }, [progress, pendingSteps.length, forceStart, onForceStartHandled, adminMode])

  useEffect(() => {
    if (!active || !currentStep?.route) return
    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route)
    }
  }, [active, currentStep, location.pathname, navigate])

  useLayoutEffect(() => {
    if (!active || !currentStep) return
    refreshSpotlight()
    const onResize = () => refreshSpotlight()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    const retry = setTimeout(refreshSpotlight, 400)
    const skipMissing = setTimeout(() => {
      const rect = getSpotlightRect(currentStep.target)
      if (!rect && stepIndex < pendingSteps.length - 1) {
        setStepIndex((i) => i + 1)
      }
    }, 600)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      clearTimeout(retry)
      clearTimeout(skipMissing)
    }
  }, [active, currentStep, refreshSpotlight, location.pathname, stepIndex, pendingSteps.length])

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
    if (stepIndex < pendingSteps.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      setActive(false)
    }
  }, [completeStep, currentStep, pendingSteps.length, stepIndex])

  const handleDismiss = useCallback(async () => {
    const next = await updateOnboardingProgress(role, { dismiss: true })
    setProgress(next)
    setActive(false)
    await refreshUser()
  }, [role, refreshUser])

  if (adminMode || !active || !currentStep || !spotlight) return null

  const tooltipStyle = getTooltipPosition(spotlight, currentStep.placement ?? 'bottom')
  const stepNumber = stepIndex + 1
  const totalSteps = pendingSteps.length

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="onboarding-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlight.left}
              y={spotlight.top}
              width={spotlight.width}
              height={spotlight.height}
              rx="6"
              fill="black"
            />
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

      <div
        className="pointer-events-none absolute rounded-[var(--radius-md)] border-[length:var(--border-width)] border-brand shadow-[0_0_0_4px_rgba(30,77,107,0.25)]"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />

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
            {stepIndex < totalSteps - 1 ? 'Next' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Small button to restart the onboarding tour */
export function OnboardingRestartButton({
  role,
  onStart,
}: {
  role: 'admin' | 'client'
  onStart: () => void
}) {
  if (isAdminModeEnabled()) return null

  const handleClick = async () => {
    await updateOnboardingProgress(role, { reset: true })
    onStart()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-nav-fg-muted transition-colors hover:text-nav-fg"
      title="Restart guided tour"
    >
      <Compass className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Tour</span>
    </button>
  )
}
