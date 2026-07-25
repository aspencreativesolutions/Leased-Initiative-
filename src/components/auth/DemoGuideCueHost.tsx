import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  DEMO_GUIDE_CUE_EVENT,
  consumeNewRegistrantsDemoCue,
  consumePendingTenantDemoCue,
  isPublicDemoSession,
  peekNewRegistrantsDemoCue,
  peekPendingTenantDemoCue,
  type DemoGuideCueDetail,
  type DemoGuideCueKind,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

type ActiveCue = {
  kind: DemoGuideCueKind
  name: string
  selector: string
  title: string
  note: string
}

function buildCue(kind: DemoGuideCueKind, name: string): ActiveCue {
  if (kind === 'new-registrants') {
    return {
      kind,
      name,
      selector: '[data-onboarding="dashboard-registrations"]',
      title: 'New Registrants',
      note: `${name}’s registration appears here or down below in “Waiting to Connect.” Accept & Draft Lease creates a draft only — then Review & Send from Pending Tenants before anything reaches the tenant.`,
    }
  }
  return {
    kind,
    name,
    selector: '[data-onboarding="dashboard-pending-tenants-list"], #tenants-waiting-lease, [data-onboarding="tenants-waiting-lease"]',
    title: 'Pending Tenants',
    note: `${name} is now a pending tenant with status Lease Drafted — open Review & Send Lease when you’re ready. Nothing is sent until you choose Send to Tenant (unless auto-send is on).`,
  }
}

function resolveTarget(selector: string): Element | null {
  for (const part of selector.split(',').map((s) => s.trim())) {
    const el = document.querySelector(part)
    if (el) return el
  }
  return null
}

/**
 * Lightweight tour-style spotlight for public-demo landlord guidance
 * (New Registrants → Pending Tenants).
 */
export function DemoGuideCueHost() {
  const [cue, setCue] = useState<ActiveCue | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const dismiss = useCallback(() => {
    if (cue?.kind === 'new-registrants') consumeNewRegistrantsDemoCue()
    if (cue?.kind === 'pending-tenant') consumePendingTenantDemoCue()
    setCue(null)
    setRect(null)
  }, [cue])

  const activate = useCallback((kind: DemoGuideCueKind, name: string) => {
    const next = buildCue(kind, name)
    setCue(next)
    const target = resolveTarget(next.selector)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [])

  useEffect(() => {
    if (!isPublicDemoSession()) return

    const pendingName = peekPendingTenantDemoCue()
    if (pendingName) {
      activate('pending-tenant', pendingName)
      return
    }
    const registrantsName = peekNewRegistrantsDemoCue()
    if (registrantsName) {
      activate('new-registrants', registrantsName)
    }

    const onCue = (event: Event) => {
      const detail = (event as CustomEvent<DemoGuideCueDetail>).detail
      if (!detail?.kind) return
      activate(detail.kind, detail.name?.trim() || 'This applicant')
    }
    window.addEventListener(DEMO_GUIDE_CUE_EVENT, onCue)
    return () => window.removeEventListener(DEMO_GUIDE_CUE_EVENT, onCue)
  }, [activate])

  useLayoutEffect(() => {
    if (!cue) return

    const update = () => {
      const target = resolveTarget(cue.selector)
      if (!target) {
        setRect(null)
        return
      }
      setRect(target.getBoundingClientRect())
    }

    update()
    const frame = window.requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const interval = window.setInterval(update, 400)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.clearInterval(interval)
    }
  }, [cue])

  useEffect(() => {
    if (!cue || cue.kind !== 'new-registrants') return
    const target = resolveTarget(cue.selector)
    if (!target) return
    const onClick = () => dismiss()
    target.addEventListener('click', onClick)
    return () => target.removeEventListener('click', onClick)
  }, [cue, dismiss])

  if (!cue) return null

  const pad = 8
  const spotlight = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  const tooltipStyle = spotlight
    ? {
        top: Math.min(
          window.innerHeight - 160,
          Math.max(16, spotlight.top + spotlight.height + 12)
        ),
        left: Math.min(
          window.innerWidth - 320,
          Math.max(16, spotlight.left + spotlight.width / 2 - 150)
        ),
      }
    : { top: 96, left: 16 }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="false"
      aria-label="Demo guide"
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="demo-guide-spotlight-mask">
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
          fill="rgba(15, 23, 42, 0.5)"
          mask="url(#demo-guide-spotlight-mask)"
        />
      </svg>

      <div
        className="pointer-events-auto absolute inset-0 z-0"
        aria-hidden
        onClick={dismiss}
      />

      {spotlight ? (
        <div
          className={cn(
            'pointer-events-none absolute rounded-[var(--radius-md)] border-[length:var(--border-width)] border-brand shadow-[0_0_0_4px_rgba(30,77,107,0.28)]',
            cue.kind === 'new-registrants' && 'demo-guide-target--pulse'
          )}
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : null}

      <div
        className="pointer-events-auto absolute z-[91] w-[min(calc(100vw-2rem),18.75rem)] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-3 shadow-lift"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="heading-display text-sm text-ink">{cue.title}</p>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-[var(--radius-sm)] p-0.5 text-ink-muted transition-colors hover:text-ink"
            aria-label="Dismiss demo guide"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">{cue.note}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 text-[11px] font-semibold uppercase tracking-caps text-brand hover:underline"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
