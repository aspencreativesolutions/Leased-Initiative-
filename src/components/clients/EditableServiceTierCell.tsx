import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SERVICE_TIERS } from '@/lib/serviceTiers'
import { cn } from '@/lib/utils'
import type { Client, ContractData, ServiceTier } from '@/types'
import { getClientServiceTier } from '@/lib/clientUtils'
import { tierSelectClass, tierSelectWidthClass } from '@/components/clients/tableControlStyles'

interface EditableServiceTierCellProps {
  client: Client
  contract?: ContractData
  onUpdate: (tier: ServiceTier) => Promise<{ requiresResend: boolean } | void>
}

export function EditableServiceTierCell({
  client,
  contract,
  onUpdate,
}: EditableServiceTierCellProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const currentTier = getClientServiceTier(client, contract)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [pendingTier, setPendingTier] = useState<ServiceTier | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  const needsResend = client.notes.some((n) =>
    n.text.includes('Service tier changed from')
  )

  const requiresContractUpdate = (tier: ServiceTier) =>
    tier !== currentTier &&
    (Boolean(contract?.pdfGenerated) ||
      ['Generated', 'Sent', 'Signed', 'Completed'].includes(client.contractStatus))

  const closePopover = () => {
    setPopoverOpen(false)
    setPendingTier(null)
    setPopoverPosition(null)
  }

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const tier = e.target.value as ServiceTier
    if (tier === currentTier) return
    setPendingTier(tier)
    setPopoverOpen(true)
  }

  const applyTier = async (tier: ServiceTier) => {
    setSaving(true)
    try {
      const result = await onUpdate(tier)
      closePopover()
      if (result?.requiresResend) {
        navigate(`/studio/clients/${client.id}/contract`)
      }
    } finally {
      setSaving(false)
    }
  }

  useLayoutEffect(() => {
    if (!popoverOpen || !containerRef.current || !popoverRef.current) {
      setPopoverPosition(null)
      return
    }

    const anchor = containerRef.current.getBoundingClientRect()
    const menu = popoverRef.current.getBoundingClientRect()
    const gap = 4
    const padding = 8
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    let top = anchor.bottom + gap
    let left = anchor.left

    if (top + menu.height > viewportH - padding) {
      top = anchor.top - menu.height - gap
    }
    if (left + menu.width > viewportW - padding) {
      left = anchor.right - menu.width
    }

    setPopoverPosition({
      top: Math.max(padding, Math.min(top, viewportH - menu.height - padding)),
      left: Math.max(padding, Math.min(left, viewportW - menu.width - padding)),
    })
  }, [popoverOpen, pendingTier])

  useEffect(() => {
    if (!popoverOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      closePopover()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopover()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [popoverOpen])

  const showContractWarning = pendingTier ? requiresContractUpdate(pendingTier) : false

  return (
    <>
      <div
        ref={containerRef}
        className={cn('relative shrink-0', tierSelectWidthClass)}
        onClick={(e) => e.stopPropagation()}
      >
        <label className="sr-only">Service tier for {client.name}</label>
        <select
          value={currentTier}
          onChange={handleSelect}
          disabled={saving}
          className={cn(
            tierSelectClass,
            'w-full cursor-pointer border-ink bg-surface-paper text-ink focus:border-accent focus:outline-none disabled:opacity-50'
          )}
          title="Change service tier"
        >
          {SERVICE_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {needsResend && (
          <p className="mt-1 text-[9px] font-bold uppercase tracking-caps text-accent">
            Resend lease
          </p>
        )}
      </div>

      {popoverOpen &&
        pendingTier &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Confirm service tier change"
            className={cn(
              'fixed z-50 w-56 rounded-sm border-2 border-ink bg-surface-paper p-3 shadow-lg',
              !popoverPosition && 'invisible'
            )}
            style={
              popoverPosition
                ? { top: popoverPosition.top, left: popoverPosition.left }
                : { top: 0, left: 0 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-caps text-ink-faint">
              Change tier
            </p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-semibold">{currentTier}</span>
              <span className="text-ink-muted"> → </span>
              <span className="font-semibold">{pendingTier}</span>
            </p>

            {showContractWarning ? (
              <div className="mt-2 flex gap-2 rounded-sm border-2 border-accent bg-accent-light p-2 text-xs text-ink">
                <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
                <p>
                  The lease for {client.name} will reset to draft. Revise and resend it after
                  updating.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">
                Save the new tier for {client.name}.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full"
                disabled={saving}
                onClick={() => applyTier(pendingTier)}
              >
                <FileText className="h-4 w-4" />
                {saving ? 'Updating…' : 'Update lease'}
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={closePopover}>
                Cancel
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
