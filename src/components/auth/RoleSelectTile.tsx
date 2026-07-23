import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Building2, KeyRound, Loader2 } from 'lucide-react'
import type { WelcomeRole } from '@/lib/welcomeSlides'
import { cn } from '@/lib/utils'

export type RoleSelectOption = {
  role: WelcomeRole
  title: string
  description: string
}

export const ROLE_SELECT_OPTIONS: RoleSelectOption[] = [
  {
    role: 'tenant',
    title: "I'm a Tenant",
    description: 'Sign in or create an account to review and sign your lease',
  },
  {
    role: 'landlord',
    title: "I'm a Landlord",
    description: 'Approve tenants, send leases, and manage your properties',
  },
]

export const DEMO_ROLE_SELECT_OPTIONS: RoleSelectOption[] = [
  {
    role: 'tenant',
    title: "I'm a Tenant",
    description: 'Explore the portal for leases, rent, and updates',
  },
  {
    role: 'landlord',
    title: "I'm a Landlord",
    description: 'Manage tenants, leases, payments, and alerts',
  },
]

type RoleSelectTileBaseProps = {
  role: WelcomeRole
  title: string
  description: string
  selected?: boolean
  disabled?: boolean
  busy?: boolean
  className?: string
  size?: 'default' | 'compact'
}

type RoleSelectTileLinkProps = RoleSelectTileBaseProps & {
  to: string
  onClick?: never
}

type RoleSelectTileButtonProps = RoleSelectTileBaseProps & {
  to?: undefined
  onClick: () => void
}

export type RoleSelectTileProps = RoleSelectTileLinkProps | RoleSelectTileButtonProps

function RoleSelectTileContent({
  role,
  title,
  description,
  busy,
}: {
  role: WelcomeRole
  title: string
  description: string
  busy?: boolean
}) {
  const Icon = role === 'landlord' ? Building2 : KeyRound

  return (
    <>
      {busy ? (
        <Loader2 className="role-select-tile__icon animate-spin" strokeWidth={1.5} aria-hidden />
      ) : (
        <Icon className="role-select-tile__icon" strokeWidth={1.5} aria-hidden />
      )}
      <div>
        <span className="role-select-tile__title heading-display">{title}</span>
        <span className="role-select-tile__description">{description}</span>
      </div>
    </>
  )
}

function tileClassName({
  selected,
  busy,
  size,
  className,
}: Pick<RoleSelectTileBaseProps, 'selected' | 'busy' | 'size' | 'className'>) {
  return cn(
    'role-select-tile',
    size === 'compact' && 'role-select-tile--compact',
    selected && 'role-select-tile--selected',
    busy && 'role-select-tile--busy',
    className
  )
}

/** Shared landlord / tenant tile for demo POV and regular onboarding. */
export function RoleSelectTile(props: RoleSelectTileProps) {
  const { role, title, description, selected, disabled, busy, className, size = 'default' } = props
  const classes = tileClassName({ selected, busy, size, className })
  const content = (
    <RoleSelectTileContent role={role} title={title} description={description} busy={busy} />
  )

  if ('to' in props && props.to) {
    return (
      <Link
        to={props.to}
        className={classes}
        aria-disabled={disabled || busy || undefined}
        tabIndex={disabled || busy ? -1 : undefined}
        onClick={(e) => {
          if (disabled || busy) e.preventDefault()
        }}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled || busy}
      aria-pressed={selected}
      aria-busy={busy || undefined}
      className={classes}
    >
      {content}
    </button>
  )
}

export function RoleSelectGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('role-select-grid', className)}>{children}</div>
}
