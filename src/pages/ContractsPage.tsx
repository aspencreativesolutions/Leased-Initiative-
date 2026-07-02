import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Trash2 } from 'lucide-react'
import { DeleteContractModal } from '@/components/contracts/DeleteContractModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { formatDate, formatDateTime } from '@/lib/utils'
import { fetchAdminAuditLog } from '@/lib/contractsApi'
import type { AdminAuditEntry } from '@/types'

export function ContractsPage() {
  const { clients, contracts, refresh } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [preselectedId, setPreselectedId] = useState<string | undefined>()
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([])

  const contractOptions = useMemo(
    () =>
      contracts.map((contract) => {
        const client = clients.find((c) => c.id === contract.clientId)
        return {
          contract,
          clientName: client?.name ?? contract.clientName,
          businessName: client?.businessName ?? contract.businessName,
        }
      }),
    [clients, contracts]
  )

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await fetchAdminAuditLog({ type: 'contract_deleted', limit: 8 })
      setAuditEntries(data.entries)
    } catch {
      setAuditEntries([])
    }
  }, [])

  useEffect(() => {
    void loadAuditLog()
  }, [loadAuditLog])

  const handleDeleted = async () => {
    await refresh()
    await loadAuditLog()
  }

  return (
    <>
      <PageHeader
        title="Contracts"
        subtitle="Track contract status across all clients."
        action={
          contracts.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreselectedId(undefined)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete contract
            </Button>
          ) : undefined
        }
      />

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts in progress"
          description="Start a contract from any client profile to see it here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contractOptions.map(({ contract, clientName, businessName }) => {
            const client = clients.find((c) => c.id === contract.clientId)
            return (
              <Card key={contract.id} className="flex flex-col">
                <div className="mb-3">
                  <h3 className="font-semibold text-ink">{businessName}</h3>
                  <p className="text-sm text-ink-muted">{contract.projectTitle}</p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {client && <StatusBadge type="contract" status={client.contractStatus} />}
                  {contract.sentAt && (
                    <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                      Portal visible
                    </span>
                  )}
                </div>
                <p className="mb-2 text-xs text-ink-faint">
                  Client: {clientName}
                  {client?.email ? ` · ${client.email}` : ''}
                </p>
                <p className="mb-4 break-all font-mono text-[10px] text-ink-faint">
                  ID {contract.id}
                </p>
                {client?.followUpDate && (
                  <p className="mb-4 text-sm text-ink-muted">
                    Follow-up: {formatDate(client.followUpDate)}
                  </p>
                )}
                <div className="mt-auto flex flex-col gap-2">
                  <Link to={`/studio/clients/${contract.clientId}/contract`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="h-4 w-4" />
                      Open contract
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full !text-accent"
                    onClick={() => {
                      setPreselectedId(contract.id)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete permanently
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {auditEntries.length > 0 && (
        <Card className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Recent contract deletions</h3>
          <p className="mt-1 text-xs text-ink-muted">Admin audit log — irreversible actions</p>
          <ul className="mt-4 divide-y divide-line">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-ink">{entry.summary}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {formatDateTime(entry.deletedAt)} · {entry.deletedByEmail} · Audit{' '}
                  <span className="font-mono">{entry.id}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DeleteContractModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        contracts={contractOptions}
        preselectedContractId={preselectedId}
        onDeleted={() => void handleDeleted()}
      />
    </>
  )
}
