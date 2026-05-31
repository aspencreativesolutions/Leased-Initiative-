import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, Clock, Eye, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ClientStatusOverview } from '@/components/clients/ClientStatusOverview'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { PortalDashboard } from '@/types'

export function PortalDashboardPage() {
  const [data, setData] = useState<PortalDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const dashboard = await apiFetch<PortalDashboard>('/api/portal/dashboard')
      setData(dashboard)
    } catch {
      setError('Could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">Loading your contracts…</div>
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description={error}
        action={
          <button type="button" onClick={load} className="text-brand hover:underline">
            Try again
          </button>
        }
      />
    )
  }

  if (!data.linked) {
    return (
      <div>
        <PageHeader title="Welcome" subtitle="Client Portal" />
        <Card padding="lg" className="mt-6">
          <p className="text-ink-muted">{data.message}</p>
          <p className="mt-4 text-sm text-ink-faint">
            Tip: register or sign in with the same email address your designer uses for you in Client Craft.
          </p>
        </Card>
      </div>
    )
  }

  const pending = data.contracts.filter((c) => c.sentAt && !c.confirmedByClient)
  const signed = data.contracts.filter((c) => c.confirmedByClient)

  return (
    <div>
      <PageHeader
        title={`Hello, ${data.client?.name ?? 'there'}`}
        subtitle={data.client?.businessName}
      />

      {data.client && (
        <ClientStatusOverview
          className="mb-6"
          projectStatus={data.client.projectStatus}
          contractStatus={data.client.contractStatus}
        />
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="label-caps mb-3 flex items-center gap-2 text-accent">
            <Clock className="h-4 w-4" />
            Action required
          </h2>
          <div className="space-y-3">
            {pending.map((contract) => (
              <Link key={contract.id} to={`/portal/contracts/${contract.id}`}>
                <Card padding="md" className="transition-colors hover:border-brand">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{contract.projectTitle}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        Sent {contract.sentAt ? formatDate(contract.sentAt) : '—'} ·{' '}
                        {contract.totalCost || 'Amount TBD'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-sm border-2 border-accent bg-accent-light px-2 py-1 text-[10px] font-bold uppercase text-accent">
                      Review & sign
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="label-caps mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          All contracts
        </h2>
        {data.contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No contracts yet"
            description="When your designer sends a contract to your account, it will appear here."
          />
        ) : (
          <div className="space-y-3">
            {data.contracts.map((contract) => (
              <Link key={contract.id} to={`/portal/contracts/${contract.id}`}>
                <Card padding="md" className="transition-colors hover:border-brand">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{contract.projectTitle}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {contract.totalCost || '—'}
                        {contract.sentAt && ` · Sent ${formatDate(contract.sentAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {contract.viewedAt && !contract.confirmedByClient && (
                        <Eye className="h-4 w-4 text-ink-faint" aria-label="Viewed" />
                      )}
                      {contract.confirmedByClient ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                          Signed
                        </span>
                      ) : contract.sentAt ? (
                        <span className="text-xs font-semibold text-accent">Pending</span>
                      ) : (
                        <span className="text-xs text-ink-faint">Draft</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {signed.length > 0 && (
        <p className="mt-8 text-center text-sm text-ink-faint">
          {signed.length} contract{signed.length !== 1 ? 's' : ''} confirmed. Your designer has been notified.
        </p>
      )}
    </div>
  )
}
