import { ExternalLink } from 'lucide-react'
import type { Client } from '@/types'

interface ClientContactInfoProps {
  client: Client
  compact?: boolean
}

export function ClientContactInfo({ client, compact = false }: ClientContactInfoProps) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <h3 className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
        Contact Information
      </h3>
      <dl className={compact ? 'space-y-2 text-xs' : 'space-y-3 text-sm'}>
        <div>
          <dt className="text-ink-faint">Email</dt>
          <dd className="break-all font-medium text-ink">{client.email}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Phone</dt>
          <dd className="font-medium text-ink">{client.phone || '—'}</dd>
        </div>
        {client.website && (
          <div>
            <dt className="text-ink-faint">Website</dt>
            <dd>
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all font-medium text-brand hover:underline"
              >
                {client.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </dd>
          </div>
        )}
        {client.socialLinks && (
          <div>
            <dt className="text-ink-faint">Social</dt>
            <dd className="break-words font-medium text-ink">{client.socialLinks}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
