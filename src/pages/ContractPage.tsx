import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ContractForm } from '@/components/contracts/ContractForm'
import { DeleteContractModal } from '@/components/contracts/DeleteContractModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'

export function ContractPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getClient, getContractForClient, refresh } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const client = id ? getClient(id) : undefined
  const existingContract = client ? getContractForClient(client.id) : undefined
  const hasContractWorkflow = Boolean(client && client.contractStatus !== 'Not Started')

  if (!client) {
    return (
      <div className="py-16 text-center">
        <p className="text-stone-600">Client not found.</p>
        <Link to="/studio/clients" className="mt-4 inline-block text-brand hover:underline">
          Back to clients
        </Link>
      </div>
    )
  }

  const deleteOptions = existingContract
    ? [
        {
          contract: existingContract,
          clientName: client.name,
          businessName: client.businessName,
        },
      ]
    : []

  return (
    <>
      <Link
        to={`/studio/clients/${client.id}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {client.name}
      </Link>

      <PageHeader
        title={existingContract ? 'Edit Lease' : 'Create Lease'}
        subtitle={`Lease for ${client.businessName} — ${client.projectName}`}
        action={
          hasContractWorkflow ? (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete lease
            </Button>
          ) : undefined
        }
      />

      <ContractForm client={client} existingContract={existingContract} />

      {hasContractWorkflow && (
        <DeleteContractModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          contracts={deleteOptions}
          workflowFallback={
            !existingContract
              ? {
                  clientId: client.id,
                  clientName: client.name,
                  businessName: client.businessName,
                  projectName: client.projectName,
                  contractStatus: client.contractStatus,
                }
              : undefined
          }
          preselectedContractId={existingContract?.id}
          onDeleted={async () => {
            await refresh()
            setDeleteOpen(false)
            navigate(`/studio/clients/${client.id}`)
          }}
        />
      )}
    </>
  )
}
