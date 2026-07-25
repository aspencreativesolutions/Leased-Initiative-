import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
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
}

function flattenItems(
  sections: NavActionsMenuSection[] | undefined,
  items: NavActionsMenuItem[] | undefined
): NavActionsMenuItem[] {
  if (sections?.length) return sections.flatMap((section) => section.items)
  return items ?? []
}

/**
 * Mobile-only overflow menu for cramped portal / studio top bars.
 * Desktop toolbars stay as individual buttons; this replaces them under `md`.
 */
export function NavActionsMenu({
  items,
  sections,
  header,
  className,
  label = 'Menu',
  triggerOnboarding,
}: NavActionsMenuProps) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)

  const flatItems = flattenItems(sections, items)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      itemRefs.current[0]?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

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
    return (
      <li key={id} role="none">
        <button
          type="button"
          role="menuitem"
          ref={(el) => {
            itemRefs.current[index] = el
          }}
          data-onboarding={dataOnboarding}
          onClick={() => {
            setOpen(false)
            onSelect()
          }}
          aria-label={ariaLabel}
          className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-brand/5 focus-visible:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:bg-brand/10"
        >
          <Icon className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.25} aria-hidden />
          <span className="min-w-0 flex-1">{itemLabel}</span>
          {trailing}
        </button>
      </li>
    )
  }

  return (
    <div ref={rootRef} className={cn('relative shrink-0 md:hidden', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        data-onboarding={triggerOnboarding}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-nav-fg/30 bg-transparent px-3 text-[11px] font-semibold text-nav-fg-muted transition-colors',
          'hover:border-nav-fg hover:text-nav-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-fg/40',
          open && 'border-nav-fg text-nav-fg'
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

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper text-ink shadow-[0_16px_48px_-20px_rgb(0_0_0_/_0.45)]"
        >
          <div className="max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto overscroll-contain p-1.5">
            {header ? <div className="mb-1.5 border-b border-line px-2.5 py-2">{header}</div> : null}

            {sections?.length ? (
              <div className="flex flex-col gap-1">
                {sections.map((section, sectionIndex) => (
                  <div key={section.id}>
                    {sectionIndex > 0 ? (
                      <div className="mx-2 my-1.5 border-t border-line" role="separator" />
                    ) : null}
                    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
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
        </div>
      ) : null}
    </div>
  )
}
