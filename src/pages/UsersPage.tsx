import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileSignature,
  Loader2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { OfficialClientBadge } from '@/components/clients/OfficialClientBadge'
import { PendingClientBadge } from '@/components/clients/PendingClientBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ApiError } from '@/lib/api'
import {
  acceptRegistration,
  dismissRegistration,
  fetchPortalUsers,
} from '@/lib/portalUsersApi'
import { formatDate } from '@/lib/utils'
import type { PendingRegistration, PortalUserAccepted, PortalUsersOverview } from '@/types'

export function UsersPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<PortalUsersOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPortalUsers()
      setOverview(data)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load portal users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAccept = async (registration: PendingRegistration) => {
    setAcceptingId(registration.id)
    setError('')
    try {
      const result = await acceptRegistration(registration.id)
      await refresh()
      navigate(`/clients/${result.client.id}/contract`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept registration')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDismiss = async (registration: PendingRegistration) => {
    setDismissingId(registration.id)
    setError('')
    try {
      await dismissRegistration(registration.id)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss registration')
    } finally {
      setDismissingId(null)
    }
  }

  const pending = overview?.pending ?? []
  const accepted = overview?.accepted ?? []

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Users"
        subtitle="Portal sign-ups awaiting acceptance and accepted clients with their current timeline stage."
      />

      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {overview && (
        <Card className="mb-6" padding="sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label-caps text-ink-faint">Team member handling clients</p>
              <p className="mt-1 font-semibold text-ink">{overview.handlerName}</p>
              {overview.handlerEmail && (
                <p className="text-sm text-ink-muted">{overview.handlerEmail}</p>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-ink-muted">
                <span className="font-semibold text-ink">{overview.pendingCount}</span> awaiting
              </span>
              <span className="text-ink-muted">
                <span className="font-semibold text-ink">{overview.acceptedCount}</span> accepted
              </span>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-ink-muted" />
              <h2 className="heading-display text-lg">Accepted clients</h2>
              {accepted.length > 0 && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                  {accepted.length}
                </span>
              )}
            </div>

            {accepted.length === 0 ? (
              <Card>
                <EmptyState
                  icon={UserCheck}
                  title="No accepted portal users yet"
                  description="Accept a registration to create a client profile and track their timeline here."
                />
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3">Project</th>
                      <th className="px-5 py-3">Timeline stage</th>
                      <th className="px-5 py-3 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {accepted.map((user) => (
                      <AcceptedUserRow key={user.userId} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-ink-muted" />
              <h2 className="heading-display text-lg">Awaiting acceptance</h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  icon={Users}
                  title="No pending sign-ups"
                  description="When someone registers at the client portal, they will appear here until you accept or dismiss them."
                />
              </Card>
            ) : (
              <ul className="divide-y divide-line rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
                {pending.map((registration) => (
                  <li
                    key={registration.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{registration.name}</p>
                        <PendingClientBadge />
                      </div>
                      <p className="truncate text-sm text-ink-muted">{registration.email}</p>
                      <p className="mt-1 text-xs text-ink-faint">
                        Registered {formatDate(registration.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={dismissingId === registration.id || acceptingId === registration.id}
                        onClick={() => handleDismiss(registration)}
                      >
                        {dismissingId === registration.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        disabled={acceptingId === registration.id || dismissingId === registration.id}
                        onClick={() => handleAccept(registration)}
                      >
                        {acceptingId === registration.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSignature className="h-4 w-4" />
                        )}
                        Accept &amp; start contract
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function AcceptedUserRow({ user }: { user: PortalUserAccepted }) {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{user.name}</span>
          {user.isOfficialClient ? <OfficialClientBadge /> : <PendingClientBadge />}
        </div>
        <p className="text-xs text-ink-muted">{user.email}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Accepted {formatDate(user.acceptedAt)}
        </p>
      </td>
      <td className="px-5 py-4">
        <p className="font-medium text-ink">{user.projectName}</p>
        <p className="text-xs text-ink-muted">{user.clientName}</p>
      </td>
      <td className="px-5 py-4">
        <span className="inline-block rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
          {user.timelineStageLabel}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          to={`/clients/${user.clientId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  )
}
