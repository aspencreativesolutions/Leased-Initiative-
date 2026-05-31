import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { OfficialClientBadge } from './OfficialClientBadge'
import { useApp } from '@/context/AppContext'
import { canMarkOfficialClient } from '@/lib/clientUtils'
import type { Client } from '@/types'

interface MarkOfficialClientCardProps {
  client: Client
}

export function MarkOfficialClientCard({ client }: MarkOfficialClientCardProps) {
  const { markOfficialClient, unmarkOfficialClient } = useApp()
  const canMark = canMarkOfficialClient(client)

  if (client.isOfficialClient) {
    return (
      <Card className="border-accent">
        <CardHeader
          title="Confirmed Client"
          subtitle={`Client since ${client.officialClientSince ? new Date(client.officialClientSince).toLocaleDateString() : '—'}`}
          action={<OfficialClientBadge />}
        />
        <p className="text-sm text-ink-muted">
          This person is a confirmed client. You can send PayPal invoices and accept payments below.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => unmarkOfficialClient(client.id)}
        >
          Move back to pending
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Confirm as Client"
        subtitle="Available after the contract is signed"
      />
      {!canMark ? (
        <div className="flex gap-3 rounded-sm border-2 border-line bg-surface p-4 text-sm text-ink">
          <ShieldCheck className="h-5 w-5 shrink-0 text-ink" />
          <p>
            Set the contract status to <strong>Signed</strong> or <strong>Completed</strong> before
            confirming them as a client. This unlocks PayPal payments.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-muted">
            Once their contract is signed, confirm them as a client to unlock PayPal payment links
            and embedded checkout.
          </p>
          <Button onClick={() => markOfficialClient(client.id)}>
            <BadgeCheck className="h-4 w-4" />
            Confirm as Client
          </Button>
        </>
      )}
    </Card>
  )
}
