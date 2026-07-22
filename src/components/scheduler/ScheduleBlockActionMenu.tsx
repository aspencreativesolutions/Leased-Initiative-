import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { formatScheduleTimeRange } from '@/lib/scheduler'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { cn, formatDate } from '@/lib/utils'
import type { ScheduleBlock } from '@/types'

export interface ScheduleBlockActionAnchor {
  block: ScheduleBlock
  rect: DOMRect
}

interface ScheduleBlockActionMenuProps {
  anchor: ScheduleBlockActionAnchor | null
  onClose: () => void
  onMove?: (block: ScheduleBlock) => void
}

function getMenuPosition(anchor: DOMRect, menuWidth: number, menuHeight: number) {
  const gap = 6
  const padding = 8
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  let top = anchor.bottom + gap
  let left = anchor.left

  if (top + menuHeight > viewportH - padding) {
    top = anchor.top - menuHeight - gap
  }

  if (left + menuWidth > viewportW - padding) {
    left = anchor.right - menuWidth
  }

  return {
    top: Math.max(padding, Math.min(top, viewportH - menuHeight - padding)),
    left: Math.max(padding, Math.min(left, viewportW - menuWidth - padding)),
  }
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">{label}</p>
      <div className="text-[11px] leading-snug text-ink">{children}</div>
    </div>
  )
}

export function ScheduleBlockActionMenu({
  anchor,
  onClose,
  onMove,
}: ScheduleBlockActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const block = anchor?.block ?? null
  const open = anchor !== null

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) {
      setPosition(null)
      return
    }
    const { width, height } = menuRef.current.getBoundingClientRect()
    setPosition(getMenuPosition(anchor.rect, width, height))
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !block) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        role="menu"
        className={cn(
          'fixed z-50 w-[12.75rem] max-w-[calc(100vw-1rem)] border border-ink bg-surface-paper shadow-lift',
          !position && 'invisible'
        )}
        style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
      >
        <div className="flex items-start justify-between gap-1.5 border-b border-line px-2 py-1.5">
          {block.clientId ? (
            <Link
              to={`/studio/clients/${block.clientId}`}
              onClick={onClose}
              className="min-w-0 break-words text-xs font-semibold text-ink hover:text-brand"
            >
              {block.businessName ?? block.clientName ?? 'Appointment'}
            </Link>
          ) : (
            <p className="min-w-0 break-words text-xs font-semibold text-ink">
              {block.businessName ?? 'Appointment'}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-0.5 text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1.5 px-2 py-2">
          {block.clientName && block.clientName !== block.businessName && (
            <DetailRow label="Tenant">{block.clientName}</DetailRow>
          )}
          {block.label && <DetailRow label="Task">{block.label}</DetailRow>}
          <DetailRow label="Time">
            {formatScheduleTimeRange(block.startTime, block.endTime)}
          </DetailRow>
          {block.serviceTier && (
            <DetailRow label="Tier">
              <ServiceTierBadge tier={migrateServiceTier(block.serviceTier)} tiny />
            </DetailRow>
          )}
          {block.deadlineDate && (
            <DetailRow label="Due">{formatDate(block.deadlineDate)}</DetailRow>
          )}
          {onMove && (
            <Button
              size="sm"
              variant="outline"
              className="mt-1 h-auto min-h-7 w-full px-1.5 py-1.5 text-[9px] leading-none tracking-normal whitespace-nowrap sm:px-2 sm:text-[10px]"
              onClick={() => onMove(block)}
            >
              Move Appointment
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
