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
          title="Official Client"
          subtitle={`Client since ${client.officialClientSince ? new Date(client.officialClientSince).toLocaleDateString() : '—'}`}
          action={<OfficialClientBadge />}
        />
        <p className="text-sm text-ink-muted">
          This person signed their contract and is an official client. They can share files through
          the client portal, and you can send PayPal invoices below.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Pending Client"
        subtitle="Becomes official after contract is signed"
      />
      <div className="flex gap-3 rounded-sm border-2 border-line bg-surface p-4 text-sm text-ink">
        <BadgeCheck className="h-5 w-5 shrink-0 text-ink-faint" />
        <p>
          Send a contract through the portal. Once the client signs and submits it, they
          automatically become an official client and can share project files with you.
        </p>
      </div>
    </Card>
  )
}
