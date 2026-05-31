import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SERVICE_TIERS } from '@/lib/scheduler'
import type { Client, ContractData, ServiceTier } from '@/types'
import { getClientServiceTier } from '@/lib/clientUtils'

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
  const currentTier = getClientServiceTier(client, contract)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingTier, setPendingTier] = useState<ServiceTier | null>(null)
  const [saving, setSaving] = useState(false)

  const needsResend = client.notes.some((n) =>
    n.text.includes('Service tier changed from')
  )

  const willRequireResend = (tier: ServiceTier) =>
    tier !== currentTier &&
    (Boolean(contract?.pdfGenerated) ||
      ['Generated', 'Sent', 'Signed', 'Completed'].includes(client.contractStatus))

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const tier = e.target.value as ServiceTier
    if (tier === currentTier) return

    if (willRequireResend(tier)) {
      setPendingTier(tier)
      setConfirmOpen(true)
    } else {
      void applyTier(tier)
    }
  }

  const applyTier = async (tier: ServiceTier) => {
    setSaving(true)
    try {
      await onUpdate(tier)
    } finally {
      setSaving(false)
      setConfirmOpen(false)
      setPendingTier(null)
    }
  }

  return (
    <>
      <div className="min-w-[6.5rem]" onClick={(e) => e.stopPropagation()}>
        <label className="sr-only">Service tier for {client.name}</label>
        <select
          value={currentTier}
          onChange={handleSelect}
          disabled={saving}
          className="w-full cursor-pointer rounded-sm border-2 border-ink bg-surface-paper px-2 py-1 text-[10px] font-black uppercase tracking-caps text-ink focus:border-accent focus:outline-none disabled:opacity-50"
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
            Resend contract
          </p>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPendingTier(null)
        }}
        title="Change service tier?"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-sm border-2 border-accent bg-accent-light p-3 text-sm text-ink">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent" />
            <p>
              Changing the tier from <strong>{currentTier}</strong> to{' '}
              <strong>{pendingTier}</strong> requires revising and resending the contract to{' '}
              {client.name}. Any sent or signed contract will be reset to draft.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmOpen(false)
                setPendingTier(null)
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!pendingTier || saving}
              onClick={() => pendingTier && applyTier(pendingTier)}
            >
              {saving ? 'Updating…' : 'Update tier & reset contract'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
