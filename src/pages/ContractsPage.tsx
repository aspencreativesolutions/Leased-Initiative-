import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/utils'

export function ContractsPage() {
  const { clients } = useApp()

  const withContracts = clients.filter(
    (c) => c.contractStatus !== 'Not Started'
  )

  return (
    <>
      <PageHeader
        title="Contracts"
        subtitle="Track contract status across all clients."
      />

      {withContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts in progress"
          description="Start a contract from any client profile to see it here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex flex-col">
              <div className="mb-3">
                <h3 className="font-semibold text-stone-800">{client.businessName}</h3>
                <p className="text-sm text-stone-500">{client.projectName}</p>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusBadge type="contract" status={client.contractStatus} />
              </div>
              <p className="mb-4 text-xs text-stone-400">
                Client: {client.name} · {client.email}
              </p>
              {client.followUpDate && (
                <p className="mb-4 text-sm text-stone-600">
                  Follow-up: {formatDate(client.followUpDate)}
                </p>
              )}
              <div className="mt-auto">
                <Link to={`/clients/${client.id}/contract`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4" />
                    {client.contractStatus === 'Not Started' ? 'Start Contract' : 'Open Contract'}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
