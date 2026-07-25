import { Link2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TenantDiscoveryMode } from '@/types'

interface TenantDiscoverySectionProps {
  value: TenantDiscoveryMode
  onChange: (mode: TenantDiscoveryMode) => void
}

const OPTIONS: {
  id: TenantDiscoveryMode
  title: string
  description: string
  icon: typeof Search
}[] = [
  {
    id: 'public',
    title: 'Public Discovery',
    description:
      'Tenants can find your agency by name during signup and choose from your rentals.',
    icon: Search,
  },
  {
    id: 'invite_only',
    title: 'Invite-Only',
    description:
      'Tenants must use a connection link or code. They pick an available rental, then appear under Waiting to Connect. Each code works once.',
    icon: Link2,
  },
]

export function TenantDiscoverySection({ value, onChange }: TenantDiscoverySectionProps) {
  const mode = value === 'invite_only' ? 'invite_only' : 'public'

  return (
    <div className="space-y-3" data-onboarding="admin-settings-discovery">
      <div>
        <p className="text-sm font-semibold text-ink">Tenant discovery</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Choose whether tenants can search for you publicly or must connect with an invite.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tenant discovery mode">
        {OPTIONS.map((option) => {
          const selected = mode === option.id
          const Icon = option.icon
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-3 text-left transition-colors',
                selected
                  ? 'border-brand bg-brand/5 text-ink'
                  : 'border-line bg-surface text-ink-muted hover:border-brand/40 hover:text-ink'
              )}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                {option.title}
              </span>
              <span className="text-[11px] leading-snug text-ink-muted">{option.description}</span>
            </button>
          )
        })}
      </div>
      {mode === 'invite_only' ? (
        <p className="text-[11px] leading-snug text-ink-muted">
          Use <strong className="font-semibold text-ink">Send Invite</strong> on the dashboard
          (or Generate Invite from Upcoming Openings) to create a one-time connection link and
          code.
        </p>
      ) : null}
    </div>
  )
}
