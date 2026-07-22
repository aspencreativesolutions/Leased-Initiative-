import { BadgeCheck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { OfficialClientBadge } from './OfficialClientBadge'
import type { Client } from '@/types'

interface MarkOfficialClientCardProps {
  client: Client
}

export function MarkOfficialClientCard({ client }: MarkOfficialClientCardProps) {
  if (client.isOfficialClient) {
    return (
      <Card className="border-accent">
        <CardHeader
          title="Active Tenant"
          subtitle={`Active since ${client.officialClientSince ? new Date(client.officialClientSince).toLocaleDateString() : '—'}`}
          action={<OfficialClientBadge />}
        />
        <p className="text-sm text-ink-muted">
          This tenant signed their lease and is now active. They can share documents through
          the tenant portal, and you can send payment requests below.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Pending Tenant"
        subtitle="Becomes active after the lease is signed"
      />
      <div className="flex gap-3 rounded-sm border-2 border-line bg-surface p-4 text-sm text-ink">
        <BadgeCheck className="h-5 w-5 shrink-0 text-ink-faint" />
        <p>
          Approve the tenant, then send a lease through the portal. Once they sign,
          they automatically become an active tenant.
        </p>
      </div>
    </Card>
  )
}
