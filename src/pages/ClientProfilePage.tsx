import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TenantDetailsContent } from '@/components/clients/TenantDetailsContent'
import { useApp } from '@/context/AppContext'

export function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getClient } = useApp()
  const client = id ? getClient(id) : undefined

  if (!client) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-muted">Tenant not found.</p>
        <Link to="/studio" className="mt-4 inline-block text-brand hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <Link
        to="/studio"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-4 shadow-lift sm:p-6">
        <TenantDetailsContent
          tenantId={client.id}
          onSelectTenant={(tenantId) => navigate(`/studio/clients/${tenantId}`)}
        />
      </div>
    </div>
  )
}
