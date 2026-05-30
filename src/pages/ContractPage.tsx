import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ContractForm } from '@/components/contracts/ContractForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useApp } from '@/context/AppContext'

export function ContractPage() {
  const { id } = useParams<{ id: string }>()
  const { getClient, getContractForClient } = useApp()
  const client = id ? getClient(id) : undefined
  const existingContract = client ? getContractForClient(client.id) : undefined

  if (!client) {
    return (
      <div className="py-16 text-center">
        <p className="text-stone-600">Client not found.</p>
        <Link to="/clients" className="mt-4 inline-block text-brand hover:underline">
          Back to clients
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        to={`/clients/${client.id}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {client.name}
      </Link>

      <PageHeader
        title="Create Contract"
        subtitle={`Contract for ${client.businessName} — ${client.projectName}`}
      />

      <ContractForm client={client} existingContract={existingContract} />
    </>
  )
}
