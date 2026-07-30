import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LeaseStatusBadge } from '@/components/clients/LeaseStatusBadge'
import { PaymentProviderLogo } from '@/components/payments/PaymentProviderLogo'
import { TenantBedAssignmentPicker } from '@/components/properties/TenantBedAssignmentPicker'
import { AddressText } from '@/components/ui/AddressText'
import { getLeaseStatusDetails } from '@/lib/clientUtils'
import {
  isWholeUnitSingleTenantLease,
  WHOLE_UNIT_LEASE_LABEL,
} from '@/lib/furnishedOccupancy'
import { paymentToneTagClass } from '@/lib/paymentStatusPresentation'
import { paymentTenantRemindHref } from '@/lib/paymentTenantRows'
import {
  findPropertyByAddress,
  tenantsAtProperty,
} from '@/lib/properties'
import {
  findBedInLayout,
  formatBedAssignmentLabel,
  resolveFurnishedFlag,
} from '@/lib/rentalBeds'
import {
  buildTenantDetailsProfile,
  formatLongDate,
  formatUsd,
  getTenantInitials,
  type TenantDetailsProfile,
} from '@/lib/tenantDetails'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div className="min-w-0">
      <p className="label-caps text-ink-faint">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="border-b border-line pb-1.5">
        <h3 className="label-caps text-ink">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function TenantAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = getTenantInitials(name)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-ink bg-surface font-semibold text-ink',
        size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-11 w-11 text-xs'
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}

function ProfileBody({
  profile,
  onSelectTenant,
  onAssignBed,
}: {
  profile: TenantDetailsProfile
  onSelectTenant?: (tenantId: string) => void
  onAssignBed?: (
    next: {
      propertyId: string
      bedroomId: string
      bedId: string
      unitOrRoomLabel: string
    } | null
  ) => void
}) {
  const { properties, clients, getContractForClient } = useApp()
  const leaseDetails = getLeaseStatusDetails(profile.client, profile.contract)
  const property =
    (profile.client.propertyId
      ? properties.find((p) => p.id === profile.client.propertyId)
      : undefined) ??
    findPropertyByAddress(properties, profile.propertyAddress)
  const occupants = property
    ? tenantsAtProperty(property, clients, getContractForClient)
    : []
  const wholeUnitLease = isWholeUnitSingleTenantLease(
    profile.client,
    property,
    occupants
  )
  const bedFound =
    !wholeUnitLease && property
      ? findBedInLayout(
          property.bedroomsLayout,
          profile.client.bedroomId,
          profile.client.bedId
        )
      : null
  const daysRemainingLabel =
    profile.daysRemaining == null
      ? null
      : profile.leaseTimelineState === 'Upcoming'
        ? profile.daysRemaining <= 0
          ? 'Starts today'
          : `${profile.daysRemaining} day${profile.daysRemaining === 1 ? '' : 's'} until start`
        : profile.daysRemaining <= 0
          ? 'Ends today'
          : `${profile.daysRemaining} day${profile.daysRemaining === 1 ? '' : 's'} remaining`

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <TenantAvatar name={profile.fullName} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {profile.fullName}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{profile.tenantStatus}</p>
          {profile.leaseBeganLabel ? (
            <p className="mt-0.5 text-sm font-medium text-ink">{profile.leaseBeganLabel}</p>
          ) : null}
          {wholeUnitLease ? (
            <p className="mt-0.5 text-sm font-medium text-ink">
              {WHOLE_UNIT_LEASE_LABEL}
            </p>
          ) : bedFound && property ? (
            <p className="mt-0.5 text-sm font-medium text-ink">
              {formatBedAssignmentLabel(
                bedFound.bedroom,
                bedFound.bed,
                resolveFurnishedFlag(property)
              )}
            </p>
          ) : null}
        </div>
      </header>

      <Section title="Personal and Account Details">
        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailStat label="Full name" value={profile.fullName} />
          <DetailStat label="Email" value={profile.email} />
          {profile.phone ? <DetailStat label="Phone" value={profile.phone} /> : null}
          <DetailStat
            label="Account created"
            value={formatLongDate(profile.accountCreatedAt)}
          />
          {profile.officialSince ? (
            <DetailStat
              label="Approved / connected"
              value={formatLongDate(profile.officialSince)}
            />
          ) : null}
          <DetailStat
            label="Preferred payment method"
            value={<PaymentProviderLogo provider={profile.paymentProvider} size="md" />}
          />
          <DetailStat label="Tenant status" value={profile.tenantStatus} />
        </div>
      </Section>

      <Section title="Property and Rental Details">
        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <p className="label-caps text-ink-faint">Property address</p>
            <p className="mt-0.5 min-w-0 text-sm font-semibold leading-snug text-ink">
              <AddressText address={profile.propertyAddress} />
            </p>
          </div>
          {profile.unitNumber ? (
            <DetailStat label="Unit" value={profile.unitNumber} />
          ) : null}
          {profile.rentalType ? (
            <DetailStat label="Rental type" value={profile.rentalType} />
          ) : null}
          <DetailStat
            label="Monthly rent"
            value={profile.monthlyRent != null ? formatUsd(profile.monthlyRent) : null}
          />
          {profile.securityDeposit != null ? (
            <DetailStat
              label="Security deposit"
              value={formatUsd(profile.securityDeposit)}
            />
          ) : null}
          <DetailStat label="Occupancy" value={profile.propertyOccupancyStatement} />
          {profile.client.applicantPartyType === 'couple' ? (
            <DetailStat
              label="Registration"
              value={
                profile.client.coupleCompanion?.name
                  ? `Couple · with ${profile.client.coupleCompanion.name} (not official tenant)`
                  : 'Couple (one official tenant)'
              }
            />
          ) : profile.client.applicantPartyType === 'solo' ? (
            <DetailStat label="Registration" value="Solo" />
          ) : null}
          {wholeUnitLease ? (
            <DetailStat label="Lease coverage" value={WHOLE_UNIT_LEASE_LABEL} />
          ) : null}
          {profile.sharesLeaseWithRoommates ? (
            <DetailStat label="Lease arrangement" value="Shared lease" />
          ) : null}
          {profile.separateLeaseFromRoommates ? (
            <DetailStat label="Lease arrangement" value="Separate lease" />
          ) : null}
        </div>
        {property && onAssignBed && !wholeUnitLease ? (
          <div className="mt-3">
            <TenantBedAssignmentPicker
              property={property}
              occupants={occupants}
              clientId={profile.client.id}
              value={{
                bedroomId: profile.client.bedroomId,
                bedId: profile.client.bedId,
              }}
              onChange={onAssignBed}
            />
          </div>
        ) : null}
      </Section>

      <Section title="Household and Roommates">
        {profile.client.applicantPartyType === 'couple' &&
        profile.client.coupleCompanion?.name ? (
          <div className="mb-3 rounded-[var(--radius-sm)] border border-line bg-surface-paper px-3 py-2.5 text-sm text-ink">
            <p className="font-semibold">Couple companion</p>
            <p className="mt-0.5 text-ink-muted">
              {profile.client.coupleCompanion.name}
              {profile.client.coupleCompanion.email
                ? ` · ${profile.client.coupleCompanion.email}`
                : ''}
              {profile.client.coupleCompanion.phone
                ? ` · ${profile.client.coupleCompanion.phone}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Listed on the application only — not an official tenant account.
            </p>
          </div>
        ) : null}
        {profile.livesAlone ? (
          <p className="text-sm font-medium text-ink">Lives alone</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-[var(--radius-md)]">
            {profile.roommates.map((roommate) => (
              <li key={roommate.id} className="flex items-center gap-3 px-3 py-2.5">
                <TenantAvatar name={roommate.name} size="sm" />
                <div className="min-w-0 flex-1">
                  {onSelectTenant ? (
                    <button
                      type="button"
                      onClick={() => onSelectTenant(roommate.id)}
                      className="truncate text-left text-sm font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {roommate.name}
                    </button>
                  ) : (
                    <p className="truncate text-sm font-semibold text-ink">{roommate.name}</p>
                  )}
                  <p className="text-xs text-ink-muted">
                    {[roommate.unitOrRoomLabel, roommate.leaseStatus]
                      .filter(Boolean)
                      .join(' · ')}
                    {roommate.sharesLease ? ' · Shared lease' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lease Details">
        <div className="mb-2">
          <LeaseStatusBadge details={leaseDetails} />
        </div>
        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {profile.leaseStartDate ? (
            <DetailStat label="Lease start" value={formatLongDate(profile.leaseStartDate)} />
          ) : null}
          {profile.leaseEndDate ? (
            <DetailStat label="Lease end" value={formatLongDate(profile.leaseEndDate)} />
          ) : null}
          {profile.leaseDurationLabel ? (
            <DetailStat label="Lease duration" value={profile.leaseDurationLabel} />
          ) : null}
          {profile.leaseSignedAt ? (
            <DetailStat label="Lease signed" value={formatLongDate(profile.leaseSignedAt)} />
          ) : null}
          <DetailStat label="Lease status" value={profile.leaseStatus} />
          {profile.scheduledStartLabel ? (
            <DetailStat label="Scheduled start" value={profile.scheduledStartLabel} />
          ) : null}
          {daysRemainingLabel ? (
            <DetailStat
              label={
                profile.leaseTimelineState === 'Upcoming'
                  ? 'Days until start'
                  : 'Days remaining'
              }
              value={daysRemainingLabel}
            />
          ) : null}
          {profile.renewalStatusLabel ? (
            <DetailStat label="Renewal / re-sign" value={profile.renewalStatusLabel} />
          ) : null}
          {profile.leaseBeganLabel ? (
            <DetailStat label="Timeline" value={profile.leaseBeganLabel} />
          ) : null}
        </div>
      </Section>

      <Section title="Payment Details">
        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailStat
            label="Monthly rent"
            value={profile.monthlyRent != null ? formatUsd(profile.monthlyRent) : null}
          />
          <DetailStat
            label="Preferred payment method"
            value={<PaymentProviderLogo provider={profile.paymentProvider} size="md" />}
          />
          <DetailStat
            label="Payment processor"
            value={<PaymentProviderLogo provider={profile.paymentProvider} size="md" />}
          />
          {profile.lastPaymentDate ? (
            <DetailStat
              label="Most recent payment"
              value={
                profile.lastPaymentAmount != null
                  ? `${formatLongDate(profile.lastPaymentDate)} · ${formatUsd(profile.lastPaymentAmount)}`
                  : formatLongDate(profile.lastPaymentDate)
              }
            />
          ) : null}
          {profile.nextPaymentDate ? (
            <DetailStat
              label="Next scheduled payment"
              value={
                profile.nextPaymentAmount != null
                  ? `${formatLongDate(profile.nextPaymentDate)} · ${formatUsd(profile.nextPaymentAmount)}`
                  : formatLongDate(profile.nextPaymentDate)
              }
            />
          ) : null}
          <DetailStat
            label="Payment status"
            value={
              profile.paymentDisplay === 'Overdue' ? (
                <Link
                  to={paymentTenantRemindHref(profile.client.id)}
                  className={cn(
                    'inline-flex max-w-full items-center justify-center',
                    'rounded-[var(--radius-sm)] border border-[length:var(--border-width)]',
                    'px-2 py-0.5 text-[11px] font-semibold leading-snug tracking-tight',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
                    'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                    'cursor-pointer hover:opacity-90',
                    paymentToneTagClass('error')
                  )}
                  aria-label={`${profile.paymentStatusLabel}. Open overdue payments for ${profile.fullName}.`}
                >
                  {profile.paymentStatusLabel}
                </Link>
              ) : (
                profile.paymentStatusLabel
              )
            }
          />
          <DetailStat label="Payments made" value={String(profile.paymentsMadeCount)} />
          <DetailStat label="Late payments" value={String(profile.latePaymentsCount)} />
          {profile.outstandingBalance != null ? (
            <DetailStat
              label="Outstanding balance"
              value={formatUsd(profile.outstandingBalance)}
            />
          ) : null}
        </div>
      </Section>

      <Section title="Late Payment History">
        {profile.latePayments.length === 0 ? (
          <p className="text-sm font-medium text-ink">No late payments</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className="px-3 py-2 font-medium text-ink-muted">Due date</th>
                  <th className="px-3 py-2 font-medium text-ink-muted">Paid on</th>
                  <th className="px-3 py-2 font-medium text-ink-muted">Days late</th>
                  <th className="px-3 py-2 font-medium text-ink-muted">Amount</th>
                  <th className="px-3 py-2 font-medium text-ink-muted">Method</th>
                </tr>
              </thead>
              <tbody>
                {profile.latePayments.map((row) => (
                  <tr key={`${row.dueDate}-${row.paidAt}`} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{formatLongDate(row.dueDate)}</td>
                    <td className="px-3 py-2 text-ink">{formatLongDate(row.paidAt)}</td>
                    <td className="px-3 py-2 text-ink">{row.daysLate}</td>
                    <td className="px-3 py-2 text-ink">{formatUsd(row.amount)}</td>
                    <td className="px-3 py-2 text-ink">
                      <PaymentProviderLogo provider={row.paymentProvider} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

interface TenantDetailsContentProps {
  tenantId: string
  onSelectTenant?: (tenantId: string) => void
}

export function TenantDetailsContent({ tenantId, onSelectTenant }: TenantDetailsContentProps) {
  const { clients, properties, getContractForClient, updateClient } = useApp()
  const profile = buildTenantDetailsProfile(
    tenantId,
    clients,
    properties,
    getContractForClient
  )

  useEffect(() => {
    const client = clients.find((c) => c.id === tenantId)
    if (!client) return
    const address =
      getContractForClient(client.id)?.clientAddress?.trim() ||
      client.projectName?.trim() ||
      ''
    const property =
      (client.propertyId
        ? properties.find((p) => p.id === client.propertyId)
        : undefined) ?? findPropertyByAddress(properties, address)
    const occupants = property
      ? tenantsAtProperty(property, clients, getContractForClient)
      : []
    if (!isWholeUnitSingleTenantLease(client, property, occupants)) return
    if (!client.bedId && !client.bedroomId) return
    updateClient(tenantId, {
      bedroomId: undefined,
      bedId: undefined,
      unitOrRoomLabel: client.unitOrRoomLabel?.trim() || 'Entire unit',
    })
  }, [tenantId, clients, properties, getContractForClient, updateClient])

  if (!profile) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">Tenant not found.</p>
    )
  }

  return (
    <ProfileBody
      profile={profile}
      onSelectTenant={onSelectTenant}
      onAssignBed={(next) => {
        if (!next) {
          updateClient(tenantId, {
            propertyId: undefined,
            bedroomId: undefined,
            bedId: undefined,
          })
          return
        }
        updateClient(tenantId, {
          propertyId: next.propertyId,
          bedroomId: next.bedroomId,
          bedId: next.bedId,
          unitOrRoomLabel: next.unitOrRoomLabel,
        })
      }}
    />
  )
}
