import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/FormField'
import { ApiError } from '@/lib/api'
import {
  permanentlyDeleteClientContract,
  permanentlyDeleteContract,
} from '@/lib/contractsApi'
import { formatDateTime } from '@/lib/utils'
import type { AdminAuditEntry, ContractData, ContractStatus } from '@/types'

export interface DeleteContractOption {
  contract: ContractData
  clientName: string
  businessName: string
}

export interface DeleteContractWorkflowFallback {
  clientId: string
  clientName: string
  businessName: string
  projectName: string
  contractStatus: ContractStatus
}

interface DeleteContractModalProps {
  open: boolean
  onClose: () => void
  contracts: DeleteContractOption[]
  workflowFallback?: DeleteContractWorkflowFallback
  preselectedContractId?: string
  onDeleted: (result: { auditEntry: AdminAuditEntry; clientId: string }) => void
}

export function DeleteContractModal({
  open,
  onClose,
  contracts,
  workflowFallback,
  preselectedContractId,
  onDeleted,
}: DeleteContractModalProps) {
  const [selectedId, setSelectedId] = useState('')
  const [confirmId, setConfirmId] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [auditEntry, setAuditEntry] = useState<AdminAuditEntry | null>(null)

  const workflowOnly = contracts.length === 0 && Boolean(workflowFallback)
  const confirmTargetId = workflowOnly ? workflowFallback!.clientId : selectedId

  const selected = useMemo(
    () => contracts.find(({ contract }) => contract.id === selectedId),
    [contracts, selectedId]
  )

  useEffect(() => {
    if (!open) return
    setSelectedId(preselectedContractId ?? contracts[0]?.contract.id ?? '')
    setConfirmId('')
    setAcknowledged(false)
    setError('')
    setAuditEntry(null)
    setSubmitting(false)
  }, [open, preselectedContractId, contracts])

  const canDelete =
    (workflowOnly || Boolean(selected)) &&
    acknowledged &&
    confirmId.trim() === confirmTargetId &&
    !submitting &&
    !auditEntry

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleDelete = async () => {
    if (!canDelete) return

    setSubmitting(true)
    setError('')
    try {
      const result = workflowOnly
        ? await permanentlyDeleteClientContract(workflowFallback!.clientId, confirmId.trim())
        : await permanentlyDeleteContract(selectedId, confirmId.trim())
      setAuditEntry(result.auditEntry)
      onDeleted({ auditEntry: result.auditEntry, clientId: result.clientId })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete lease')
    } finally {
      setSubmitting(false)
    }
  }

  if (contracts.length === 0 && !workflowFallback) {
    return (
      <Modal open={open} onClose={handleClose} title="Delete lease" size="md">
        <p className="text-sm text-ink-muted">No leases exist to delete.</p>
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    )
  }

  if (auditEntry) {
    return (
      <Modal open={open} onClose={handleClose} title="Lease deleted" size="md">
        <div className="rounded-sm border-2 border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          <p className="font-medium text-ink">Deletion logged for audit</p>
          <p className="mt-2">{auditEntry.summary}</p>
          <dl className="mt-3 space-y-1 text-xs">
            <div>
              <dt className="inline font-semibold text-ink-faint">Audit ID: </dt>
              <dd className="inline font-mono text-ink">{auditEntry.id}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink-faint">Deleted at: </dt>
              <dd className="inline text-ink">{formatDateTime(auditEntry.deletedAt)}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-ink-faint">Admin: </dt>
              <dd className="inline text-ink">{auditEntry.deletedByEmail}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          The lease is removed from your dashboard and the tenant portal. You can create a new
          lease for this tenant from scratch.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Permanently delete lease" size="lg">
      <div className="mb-4 flex gap-3 rounded-sm border-2 border-accent bg-accent-light px-4 py-3 text-sm text-accent">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This action is <strong>irreversible</strong>. The lease, portal view, signatures,
          deposit invoice links, and lease workflow steps will be permanently removed. The project
          timeline returns to the Inquiry stage so you can start a fresh lease.
        </p>
      </div>

      {workflowOnly && workflowFallback ? (
        <div className="rounded-sm border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          <p className="font-medium text-ink">
            {workflowFallback.businessName} — {workflowFallback.projectName}
          </p>
          <p className="mt-1">
            Client: {workflowFallback.clientName} · Status:{' '}
            <strong className="text-ink">{workflowFallback.contractStatus}</strong>
          </p>
          <p className="mt-2 text-xs">
            No lease file is stored for this tenant, but the workflow shows lease activity.
            Deleting will clear the status and portal view so you can start over.
          </p>
          <p className="mt-2 break-all font-mono text-[10px] text-ink-faint">
            Client ID {workflowFallback.clientId}
          </p>
        </div>
      ) : (
        <>
          <Select
            label="Select lease"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setConfirmId('')
            }}
          >
            {contracts.map(({ contract, clientName, businessName }) => (
              <option key={contract.id} value={contract.id}>
                {businessName} — {contract.projectTitle} ({clientName}) · ID {contract.id}
              </option>
            ))}
          </Select>

          {selected && (
            <div className="mt-4 rounded-sm border border-line bg-surface px-4 py-3 text-xs text-ink-muted">
              <p>
                <span className="font-semibold text-ink">Lease ID:</span>{' '}
                <span className="font-mono">{selected.contract.id}</span>
              </p>
              <p className="mt-1">
                Status: {selected.contract.sentAt ? 'Sent to portal' : 'Not sent'}
                {selected.contract.signedAt ? ' · Signed' : ''}
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-4">
        <Input
          label={workflowOnly ? 'Confirm client ID' : 'Confirm lease ID'}
          hint={`Type the exact ${workflowOnly ? 'client' : 'lease'} ID above to confirm`}
          value={confirmId}
          onChange={(e) => setConfirmId(e.target.value)}
          placeholder={confirmTargetId}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="mt-1"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span>I understand this permanently deletes the lease and cannot be undone.</span>
      </label>

      {error && (
        <p className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" disabled={submitting} onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="danger" disabled={!canDelete} onClick={() => void handleDelete()}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete permanently
        </Button>
      </div>
    </Modal>
  )
}
