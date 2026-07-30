import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import {
  DEMO_TOUR_NOTICE_HIGHLIGHT_EVENT,
  notifyDemoTourNoticeConsumed,
  type DemoTourNoticeHighlightDetail,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

export type NavActionsMenuItem = {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  /** Optional trailing content (badges, etc.) */
  trailing?: ReactNode
  /** Tour / onboarding hook */
  dataOnboarding?: string
  /** Extra aria-label (e.g. when a badge adds context) */
  ariaLabel?: string
}

export type NavActionsMenuSection = {
  id: string
  label: string
  items: NavActionsMenuItem[]
}

type NavActionsMenuProps = {
  /** Flat list (portal). Ignored when `sections` is provided. */
  items?: NavActionsMenuItem[]
  /** Grouped list with section labels (landlord mobile menu). */
  sections?: NavActionsMenuSection[]
  /** Extra node above the item list (e.g. appearance toggle) */
  header?: ReactNode
  className?: string
  /** Label on the trigger button */
  label?: string
  /** Tour hook on the Menu trigger */
  triggerOnboarding?: string
  /**
   * Which viewport this instance serves for the demo tour notice highlight.
   * Mobile and desktop menus can both mount; only the matching visible one opens.
   */
  tourNoticeScope?: 'mobile' | 'desktop'
}

function flattenItems(
  sections: NavActionsMenuSection[] | undefined,
  items: NavActionsMenuItem[] | undefined
): NavActionsMenuItem[] {
  if (sections?.length) return sections.flatMap((section) => section.items)
  return items ?? []
}

function scopeMatches(
  detail: DemoTourNoticeHighlightDetail | undefined,
  scope: 'mobile' | 'desktop' | undefined
): boolean {
  const wanted = detail?.menuScope ?? 'any'
  if (wanted === 'any') return true
  if (!scope) return false
  return scope === wanted
}

/**
 * Overflow menu for portal / studio top bars.
 * Parent controls viewport visibility (e.g. `md:hidden` for mobile-only).
 * The panel is portaled to `document.body` so sticky navs and overflow clips
 * never tuck it behind page chrome.
 */
export function NavActionsMenu({
  items,
  sections,
  header,
  className,
  label = 'Menu',
  triggerOnboarding,
  tourNoticeScope,
}: NavActionsMenuProps) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [tourNoticeActive, setTourNoticeActive] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null)

  const flatItems = flattenItems(sections, items)

  useEffect(() => {
    const onHighlight = (event: Event) => {
      const detail = (event as CustomEvent<DemoTourNoticeHighlightDetail>).detail
      if (!detail) return
      if (!scopeMatches(detail, tourNoticeScope)) {
        // Another menu instance owns this highlight — stay closed/unhighlighted.
        if (detail.active) {
          setTourNoticeActive(false)
          setOpen(false)
        }
        return
      }
      if (detail.active) {
        setTourNoticeActive(true)
        setOpen(true)
      } else {
        setTourNoticeActive(false)
        setOpen(false)
      }
    }
    window.addEventListener(DEMO_TOUR_NOTICE_HIGHLIGHT_EVENT, onHighlight)
    return () => window.removeEventListener(DEMO_TOUR_NOTICE_HIGHLIGHT_EVENT, onHighlight)
  }, [tourNoticeScope])

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      // Hidden twin (mobile vs desktop) — don't leave a floating portaled panel.
      if (rect.width < 1 && rect.height < 1) {
        if (!tourNoticeActive) setOpen(false)
        return
      }
      const gap = 6.4
      const sidePad = 12
      const maxWidth = tourNoticeActive
        ? Math.min(14.5 * 16, window.innerWidth - 7.75 * 16)
        : window.innerWidth - sidePad * 2

      let right = window.innerWidth - rect.right
      right = Math.max(sidePad, Math.min(right, window.innerWidth - sidePad - 8))

      setPanelStyle({
        top: Math.min(rect.bottom + gap, window.innerHeight - sidePad),
        right,
        maxWidth: `min(${maxWidth}px, calc(100vw - 1.5rem))`,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    // Capture scroll from nested overflow containers (portal toolbar, etc.).
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, tourNoticeActive])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (tourNoticeActive) return
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      if (target && panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (tourNoticeActive) return
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, tourNoticeActive])

  useEffect(() => {
    if (!open) return
    if (tourNoticeActive) {
      const frame = window.requestAnimationFrame(() => {
        // Scroll only inside the menu panel — never the document (that left
        // landlord demo landings mid-page when "Take the tour" was revealed).
        const tourBtn = panelRef.current?.querySelector<HTMLElement>('[data-menu-item="tour"]')
        const scrollParent = panelRef.current?.querySelector<HTMLElement>('.overflow-y-auto')
        if (tourBtn && scrollParent) {
          const btnRect = tourBtn.getBoundingClientRect()
          const parentRect = scrollParent.getBoundingClientRect()
          const relativeTop = btnRect.top - parentRect.top + scrollParent.scrollTop
          const relativeBottom = relativeTop + btnRect.height
          const viewTop = scrollParent.scrollTop
          const viewBottom = viewTop + scrollParent.clientHeight
          if (relativeTop < viewTop) {
            scrollParent.scrollTop = Math.max(0, relativeTop - 8)
          } else if (relativeBottom > viewBottom) {
            scrollParent.scrollTop = Math.max(0, relativeBottom - scrollParent.clientHeight + 8)
          }
        }
      })
      return () => window.cancelAnimationFrame(frame)
    }
    const frame = window.requestAnimationFrame(() => {
      itemRefs.current[0]?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, tourNoticeActive])

  const focusItemAt = (index: number) => {
    const count = flatItems.length
    if (count === 0) return
    const next = ((index % count) + count) % count
    itemRefs.current[next]?.focus()
  }

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItemAt(currentIndex < 0 ? 0 : currentIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItemAt(currentIndex < 0 ? flatItems.length - 1 : currentIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusItemAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusItemAt(flatItems.length - 1)
    }
  }

  let itemIndex = 0

  const renderItem = (item: NavActionsMenuItem) => {
    const index = itemIndex++
    const { id, label: itemLabel, icon: Icon, onSelect, trailing, dataOnboarding, ariaLabel } =
      item
    const isTourItem = id === 'tour'
    const highlightItem = tourNoticeActive && isTourItem
    return (
      <li key={id} role="none">
        <button
          type="button"
          role="menuitem"
          ref={(el) => {
            itemRefs.current[index] = el
          }}
          data-onboarding={dataOnboarding}
          data-menu-item={id}
          data-tour-notice-item={highlightItem ? 'true' : undefined}
          onClick={() => {
            if (tourNoticeActive && isTourItem) {
              notifyDemoTourNoticeConsumed()
            }
            setOpen(false)
            onSelect()
          }}
          aria-label={ariaLabel}
          className={cn(
            'flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-brand/5 focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:bg-brand/10',
            highlightItem &&
              'demo-tour-notice-item ring-2 ring-brand ring-offset-2 ring-offset-surface-paper bg-brand/10'
          )}
        >
          <Icon
            className={cn('h-4 w-4 shrink-0 text-brand', highlightItem && 'text-brand')}
            strokeWidth={2.25}
            aria-hidden
          />
          <span className="whitespace-nowrap">{itemLabel}</span>
          {trailing}
        </button>
      </li>
    )
  }

  const menuPanel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            data-tour-notice-panel={tourNoticeActive ? 'true' : undefined}
            className={cn(
              // Above sticky navs, page chrome, live-update beacon, and tour overlays.
              'fixed z-[220] w-fit overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper text-ink shadow-[0_16px_48px_-20px_rgb(0_0_0_/_0.45)]',
              !panelStyle && 'invisible',
              tourNoticeActive &&
                'demo-tour-notice-panel max-w-[min(14.5rem,calc(100vw-7.75rem))]'
            )}
            style={panelStyle ?? { top: 0, right: 0 }}
          >
            <div className="max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto overscroll-contain p-1">
              {header ? <div className="mb-1.5 border-b border-line px-2.5 py-2">{header}</div> : null}

              {sections?.length ? (
                <div className="flex w-fit min-w-0 flex-col gap-0.5">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id} className="w-fit min-w-0">
                      {sectionIndex > 0 ? (
                        <div className="mx-2 my-1 border-t border-line" role="separator" />
                      ) : null}
                      <p className="whitespace-pre-line px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase leading-tight tracking-caps text-ink-muted">
                        {section.label}
                      </p>
                      <ul className="flex flex-col gap-0.5" role="none">
                        {section.items.map(renderItem)}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5" role="none">
                  {(items ?? []).map(renderItem)}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div
      ref={rootRef}
      className={cn('relative shrink-0', open && 'z-[220]', className)}
      data-tour-notice-menu={tourNoticeActive ? 'true' : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (tourNoticeActive) return
          setOpen((value) => !value)
        }}
        data-onboarding={triggerOnboarding}
        data-tour-notice-trigger={tourNoticeActive ? 'true' : undefined}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-nav-fg/30 bg-transparent px-3 text-[11px] font-semibold text-nav-fg-muted transition-colors',
          'hover:border-nav-fg hover:text-nav-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-fg/40',
          open && 'border-nav-fg text-nav-fg',
          tourNoticeActive &&
            'demo-tour-notice-trigger border-nav-fg text-nav-fg shadow-[0_0_0_3px_rgba(255,255,255,0.35)]'
        )}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
      >
        {label}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {menuPanel}
    </div>
  )
}
