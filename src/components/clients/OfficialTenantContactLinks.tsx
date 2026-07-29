import { MessageSquare } from 'lucide-react'
import { normalizeSmsPhone } from '@/lib/tenantMessageTemplates'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'

interface OfficialTenantContactLinksProps {
  client: Client
  className?: string
  /** Slightly tighter type for dense mobile tiles. */
  compact?: boolean
}

function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '')
  if (!digits || digits.replace(/\D/g, '').length < 7) return null
  return `tel:${digits}`
}

/**
 * Email + phone under an official tenant’s name.
 * Email opens mail; phone number calls, message icon opens SMS.
 */
export function OfficialTenantContactLinks({
  client,
  className,
  compact = false,
}: OfficialTenantContactLinksProps) {
  const email = client.email?.trim() || ''
  const phone = client.phone?.trim() || ''
  if (!email && !phone) return null

  const callHref = phone ? telHref(phone) : null
  const smsPhone = phone ? normalizeSmsPhone(phone) : null
  const smsHref = smsPhone ? `sms:${smsPhone}` : null
  const textClass = compact
    ? 'text-[11px] leading-snug'
    : 'text-xs leading-snug'

  return (
    <div
      className={cn(
        'mt-0.5 flex min-w-0 flex-col gap-0.5 text-ink-muted',
        textClass,
        className
      )}
    >
      {email ? (
        <a
          href={`mailto:${email}`}
          className="min-w-0 truncate hover:text-brand hover:underline"
          title={`Email ${client.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {email}
        </a>
      ) : null}
      {phone ? (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1">
          {callHref ? (
            <a
              href={callHref}
              className="min-w-0 truncate hover:text-brand hover:underline"
              title={`Call ${client.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              {phone}
            </a>
          ) : (
            <span className="min-w-0 truncate">{phone}</span>
          )}
          {smsHref ? (
            <a
              href={smsHref}
              className="rounded-sm p-0.5 text-ink-faint transition-colors hover:bg-ink/[0.06] hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
              title={`Message ${client.name}`}
              aria-label={`Message ${client.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </a>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
