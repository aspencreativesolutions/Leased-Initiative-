import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  getPublicDemoRole,
  hasSeenDemoTourNotice,
  isPublicDemoSession,
  markDemoTourNoticeSeen,
  peekNewRegistrantsDemoCue,
  peekPendingTenantDemoCue,
  setDemoTourNoticeHighlight,
  type DemoTourNoticePov,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

type SpotlightRects = {
  trigger: DOMRect | null
  panel: DOMRect | null
  item: DOMRect | null
}

function resolvePov(roleFromAuth: string | undefined | null): DemoTourNoticePov | null {
  const sessionRole = getPublicDemoRole()
  if (sessionRole === 'landlord' || sessionRole === 'tenant') return sessionRole
  if (roleFromAuth === 'admin') return 'landlord'
  if (roleFromAuth === 'client') return 'tenant'
  return null
}

function menuScopeForViewport(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile'
}

function unionRect(a: DOMRect | null, b: DOMRect | null): DOMRect | null {
  if (!a) return b
  if (!b) return a
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  const right = Math.max(a.right, b.right)
  const bottom = Math.max(a.bottom, b.bottom)
  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * One-time per-POV notice in the public demo: explains that the guided tour is
 * optional and highlights Menu → Take the tour. Does not start the tour.
 */
export function DemoTourNoticeHost() {
  const { user, isPublicDemo } = useAuth()
  const location = useLocation()
  const [pov, setPov] = useState<DemoTourNoticePov | null>(null)
  const [visible, setVisible] = useState(false)
  const [rects, setRects] = useState<SpotlightRects>({
    trigger: null,
    panel: null,
    item: null,
  })
  const continueRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = 'demo-tour-notice-title'
  const descId = 'demo-tour-notice-desc'

  const dismiss = useCallback(() => {
    if (pov) markDemoTourNoticeSeen(pov)
    setDemoTourNoticeHighlight(false)
    setVisible(false)
    setPov(null)
    const restore = previousFocusRef.current
    previousFocusRef.current = null
    window.requestAnimationFrame(() => {
      const menuTrigger = document.querySelector<HTMLElement>(
        '[data-onboarding="admin-desktop-menu"], [data-onboarding="admin-mobile-menu"], [data-onboarding="portal-desktop-menu"], [data-onboarding="portal-mobile-menu"]'
      )
      const focusTarget =
        restore && document.contains(restore) ? restore : menuTrigger
      focusTarget?.focus?.()
    })
  }, [pov])

  const tryShow = useCallback(() => {
    if (visible) return
    if (!isPublicDemoSession()) return
    if (!(isPublicDemo || user?.publicDemo)) return
    if (!user) return

    const nextPov = resolvePov(user.role)
    if (!nextPov) return
    if (hasSeenDemoTourNotice(nextPov)) return

    // Defer while landlord guide cues are active so we don’t stack overlays.
    if (nextPov === 'landlord') {
      if (peekNewRegistrantsDemoCue() || peekPendingTenantDemoCue()) return
    }

    const path = location.pathname
    const onLandlordApp = path.startsWith('/studio')
    const onTenantApp = path.startsWith('/portal')
    if (nextPov === 'landlord' && !onLandlordApp) return
    if (nextPov === 'tenant' && !onTenantApp) return

    setPov(nextPov)
    setVisible(true)
  }, [isPublicDemo, location.pathname, user, visible])

  useEffect(() => {
    tryShow()
  }, [tryShow, location.pathname, user?.id, user?.role])

  // Re-check after guide cues clear.
  useEffect(() => {
    if (visible) return
    if (!isPublicDemoSession()) return
    const interval = window.setInterval(() => {
      tryShow()
    }, 700)
    return () => window.clearInterval(interval)
  }, [tryShow, visible])

  useEffect(() => {
    if (!visible || !pov) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const activate = () => {
      setDemoTourNoticeHighlight(true, menuScopeForViewport())
      window.requestAnimationFrame(() => {
        continueRef.current?.focus()
      })
    }

    const timer = window.setTimeout(activate, 350)
    const onResize = () => {
      setDemoTourNoticeHighlight(true, menuScopeForViewport())
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      setDemoTourNoticeHighlight(false)
    }
  }, [visible, pov])

  useEffect(() => {
    if (!visible) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab') return
      const root = continueRef.current?.closest('[role="dialog"]')
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible, dismiss])

  useLayoutEffect(() => {
    if (!visible) return

    const update = () => {
      const trigger = document.querySelector('[data-tour-notice-trigger]')
      const panel = document.querySelector('[data-tour-notice-panel]')
      const item = document.querySelector('[data-tour-notice-item]')
      setRects({
        trigger: trigger?.getBoundingClientRect() ?? null,
        panel: panel?.getBoundingClientRect() ?? null,
        item: item?.getBoundingClientRect() ?? null,
      })
    }

    update()
    const frame = window.requestAnimationFrame(update)
    const interval = window.setInterval(update, 200)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(interval)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [visible])

  if (!visible || !pov) return null

  const pad = 6
  const holes: Array<{ left: number; top: number; width: number; height: number; rx: number }> =
    []
  for (const rect of [rects.trigger, rects.panel]) {
    if (!rect || rect.width < 2 || rect.height < 2) continue
    holes.push({
      left: Math.max(0, rect.left - pad),
      top: Math.max(0, rect.top - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      rx: 8,
    })
  }

  const menuCluster = unionRect(rects.trigger, rects.panel)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const cardWidth = Math.min(340, viewportW - 32)

  let cardTop = 96
  let cardLeft = 16
  let pinToBottom = false
  if (isMobile) {
    // Keep the prompt in the lower viewport so an open Menu near the top stays readable.
    pinToBottom = true
    cardTop = viewportH - 220
    cardLeft = 16
  } else if (menuCluster) {
    cardLeft = Math.min(
      viewportW - cardWidth - 16,
      Math.max(16, menuCluster.left + menuCluster.width / 2 - cardWidth / 2)
    )
    const below = menuCluster.bottom + 14
    const fitsBelow = below + 200 < viewportH - 16
    cardTop = fitsBelow ? below : Math.max(16, menuCluster.top - 210)
  }

  return (
    <div
      className="fixed inset-0 z-[95]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="demo-tour-notice-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {holes.map((hole, index) => (
              <rect
                key={index}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={hole.rx}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.52)"
          mask="url(#demo-tour-notice-spotlight-mask)"
        />
      </svg>

      <div className="absolute inset-0 z-0" aria-hidden />

      {holes.map((hole, index) => (
        <div
          key={`ring-${index}`}
          className={cn(
            'pointer-events-none absolute rounded-[var(--radius-md)] border-[length:var(--border-width)] border-brand',
            'shadow-[0_0_0_3px_rgba(30,77,107,0.28)]',
            index === 0 && 'demo-tour-notice-target--pulse'
          )}
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      ))}

      {rects.item ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-sm)] border-2 border-dashed border-brand/80"
          style={{
            top: Math.max(0, rects.item.top - 4),
            left: Math.max(0, rects.item.left - 4),
            width: rects.item.width + 8,
            height: rects.item.height + 8,
          }}
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          'pointer-events-auto absolute z-[96] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-4 shadow-lift',
          'left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] sm:right-auto sm:w-[min(calc(100vw-2rem),21.25rem)]'
        )}
        style={
          pinToBottom
            ? {
                bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                top: 'auto',
                maxWidth: undefined,
              }
            : {
                top: `max(${cardTop}px, calc(0.75rem + env(safe-area-inset-top, 0px)))`,
                left: cardLeft,
                right: 'auto',
                maxWidth: cardWidth,
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
              }
        }
      >
        <p id={titleId} className="heading-display text-base text-ink">
          Explore at your own pace
        </p>
        <p id={descId} className="mt-2 text-sm leading-snug text-ink-muted">
          If you would like a guided tour of the features, the Take the tour option will always be
          available in the Menu dropdown.
        </p>
        <button
          ref={continueRef}
          type="button"
          onClick={dismiss}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-light hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Continue to manual demo
        </button>
      </div>
    </div>
  )
}
