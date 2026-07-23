import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LeaseStatusBadge } from '@/components/clients/LeaseStatusBadge'
import { Modal } from '@/components/ui/Modal'
import {
  getLeaseStatusDetails,
  getTenantAddress,
} from '@/lib/clientUtils'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import { estimateMonthlyRent } from '@/lib/paymentTenantRows'
import {
  activeTenantsAtProperty,
  openUnitsForRental,
  remainingTenantCapacity,
  resolveLeaseEndYmd,
} from '@/lib/properties'
import { getRentalTypeDescription } from '@/lib/rentalTypes'
import { formatDate } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import type { Property } from '@/types'

interface RentalDetailModalProps {
  property: Property | null
  open: boolean
  onClose: () => void
}

function formatRent(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toLocaleString()}`
}

function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}

export function RentalDetailModal({ property, open, onClose }: RentalDetailModalProps) {
  const { clients, getContractForClient } = useApp()

  if (!property) return null

  const currentTenants = activeTenantsAtProperty(property, clients, getContractForClient)
  const openUnits = openUnitsForRental(property, clients, getContractForClient)
  const remainingCapacity = remainingTenantCapacity(property, clients, getContractForClient)
  const typeDescription = getRentalTypeDescription(property.propertyType)

  return (
    <Modal open={open} onClose={onClose} title="Rental details" size="xl">
      <div className="space-y-6">
        <div>
          <p className="label-caps text-ink-faint">Property Address</p>
          <p className="mt-1 font-display text-xl font-semibold leading-snug text-ink">
            {property.address}
          </p>
          {property.addressDetails ? (
            <p className="mt-1 text-xs text-ink-muted">
              {[
                property.addressDetails.street,
                property.addressDetails.city,
                property.addressDetails.state,
                property.addressDetails.zip,
              ]
                .filter(Boolean)
                .join(', ')}
              {property.addressDetails.lat != null && property.addressDetails.lng != null
                ? ` · ${property.addressDetails.lat.toFixed(5)}, ${property.addressDetails.lng.toFixed(5)}`
                : ''}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="label-caps text-ink-faint">Rental Type</p>
            <p className="mt-1 text-sm font-semibold text-ink">{property.propertyType}</p>
            {typeDescription ? (
              <p className="mt-0.5 text-xs text-ink-muted">{typeDescription}</p>
            ) : null}
          </div>
          <DetailStat label="Bedrooms" value={property.bedrooms} />
          <DetailStat label="Maximum Tenants" value={property.maxTenants} />
          <DetailStat label="Number of Units" value={property.unitCount} />
          <DetailStat label="Current Tenants" value={currentTenants.length} />
          <DetailStat label="Open Units" value={openUnits} />
          <DetailStat label="Remaining Tenant Capacity" value={remainingCapacity} />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
            <div>
              <p className="label-caps">Current tenants</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Official tenants on in-term leases at this rental
              </p>
            </div>
          </div>

          {currentTenants.length === 0 ? (
            <p className="text-sm text-ink-muted">No current tenants assigned to this rental.</p>
          ) : (
            <ul className="space-y-3">
              {currentTenants.map((tenant) => {
                const contract = getContractForClient(tenant.id)
                const leaseStatus = getLeaseStatusDetails(tenant, contract)
                const start =
                  leaseStatus.startDate ||
                  (contract?.startDate?.slice(0, 10) ?? tenant.demoLeaseStartDate?.slice(0, 10))
                const end =
                  leaseStatus.endDate || resolveLeaseEndYmd(tenant, contract)
                const durationMonths = leaseStatus.termMonths ?? tenant.leaseLengthMonths
                const rent = estimateMonthlyRent(tenant, contract)
                const address = getTenantAddress(tenant, contract)

                return (
                  <li
                    key={tenant.id}
                    className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-3 sm:px-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/studio/clients/${tenant.id}`}
                          className="font-semibold text-ink hover:text-brand hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {tenant.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {tenant.email}
                          {tenant.phone ? ` · ${tenant.phone}` : ''}
                        </p>
                      </div>
                      <LeaseStatusBadge details={leaseStatus} />
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-ink-faint">Lease start</dt>
                        <dd className="mt-0.5 font-medium text-ink">
                          {start ? formatDate(start) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Lease end</dt>
                        <dd className="mt-0.5 font-medium text-ink">
                          {end ? formatDate(end) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Lease duration</dt>
                        <dd className="mt-0.5 font-medium text-ink">
                          {durationMonths
                            ? formatLeaseLengthLabel(durationMonths)
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Monthly rent</dt>
                        <dd className="mt-0.5 font-medium text-ink">{formatRent(rent)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Lease status</dt>
                        <dd className="mt-0.5 font-medium text-ink">{leaseStatus.status}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Assigned address</dt>
                        <dd className="mt-0.5 break-words font-medium text-ink">{address}</dd>
                      </div>
                      {tenant.leaseLengthMonths ? (
                        <div>
                          <dt className="text-ink-faint">Preferred term</dt>
                          <dd className="mt-0.5 font-medium text-ink">
                            {formatLeaseLengthLabel(tenant.leaseLengthMonths)}
                          </dd>
                        </div>
                      ) : null}
                      {tenant.isOfficialClient ? (
                        <div>
                          <dt className="text-ink-faint">Official since</dt>
                          <dd className="mt-0.5 font-medium text-ink">
                            {tenant.officialClientSince
                              ? formatDate(tenant.officialClientSince)
                              : '—'}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
