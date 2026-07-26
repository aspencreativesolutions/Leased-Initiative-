import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LeaseStatusBadge } from '@/components/clients/LeaseStatusBadge'
import { Modal } from '@/components/ui/Modal'
import {
  getLeaseStatusDetails,
  getTenantAddress,
} from '@/lib/clientUtils'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import {
  WHOLE_UNIT_LEASE_LABEL,
  isWholeUnitSingleTenantLease,
} from '@/lib/furnishedOccupancy'
import { estimateMonthlyRent } from '@/lib/paymentTenantRows'
import {
  activeTenantsAtProperty,
  remainingTenantCapacity,
  rentalBedOccupancyForProperty,
  rentalVacancySnapshot,
  resolveLeaseEndYmd,
} from '@/lib/properties'
import {
  BED_SIZE_LABELS,
  ensurePropertyBedLayout,
  findBedInLayout,
  formatBedAssignmentLabel,
} from '@/lib/rentalBeds'
import {
  buildRentalPricingSummary,
  formatUsd,
  resolvePropertyMonthlyRent,
} from '@/lib/rentalRent'
import { getRentalTypeDescription } from '@/lib/rentalTypes'
import { formatDate } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import type { Property } from '@/types'

interface RentalDetailModalProps {
  property: Property | null
  open: boolean
  onClose: () => void
}

function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}

export function RentalDetailModal({ property, open, onClose }: RentalDetailModalProps) {
  const { clients, properties, getContractForClient } = useApp()

  if (!property) return null

  const ensured = ensurePropertyBedLayout(property)
  const currentTenants = activeTenantsAtProperty(ensured, clients, getContractForClient)
  const vacancy = rentalVacancySnapshot(ensured, clients, getContractForClient)
  const bedOcc = rentalBedOccupancyForProperty(ensured, clients, getContractForClient)
  const remainingCapacity = remainingTenantCapacity(ensured, clients, getContractForClient)
  const typeDescription = getRentalTypeDescription(ensured.propertyType)
  const pricing = buildRentalPricingSummary(ensured, clients, getContractForClient)
  const unitRent = resolvePropertyMonthlyRent(ensured)
  const surfacesBeds = vacancy.surfacesBeds

  return (
    <Modal open={open} onClose={onClose} title="Rental details" size="xl" fitContent>
      <div className="space-y-4">
        <div>
          <p className="label-caps text-ink-faint">Property Address</p>
          <p className="mt-0.5 font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
            {ensured.address}
          </p>
          {ensured.addressDetails ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              {[
                ensured.addressDetails.street,
                ensured.addressDetails.city,
                ensured.addressDetails.state,
                ensured.addressDetails.zip,
              ]
                .filter(Boolean)
                .join(', ')}
              {ensured.addressDetails.lat != null && ensured.addressDetails.lng != null
                ? ` · ${ensured.addressDetails.lat.toFixed(5)}, ${ensured.addressDetails.lng.toFixed(5)}`
                : ''}
            </p>
          ) : null}
        </div>

        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="label-caps text-ink-faint">Rental Type</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{ensured.propertyType}</p>
            {typeDescription ? (
              <p className="mt-0.5 text-xs text-ink-muted">{typeDescription}</p>
            ) : null}
          </div>
          <DetailStat label="Monthly Rent" value={formatUsd(unitRent)} />
          <DetailStat
            label="Occupancy"
            value={
              surfacesBeds
                ? `${bedOcc.currentOccupants} of ${bedOcc.maxOccupancy} people`
                : currentTenants.length > 0
                  ? WHOLE_UNIT_LEASE_LABEL
                  : 'Entire home available'
            }
          />
          {surfacesBeds ? (
            <>
              <DetailStat
                label="Beds"
                value={`${bedOcc.occupiedBeds} of ${bedOcc.totalBeds} occupied`}
              />
              <DetailStat
                label="Per-bed share (avg)"
                value={
                  pricing.tenantShare != null
                    ? `${formatUsd(pricing.tenantShare)}/month`
                    : '—'
                }
              />
              <DetailStat label="Bedrooms" value={ensured.bedrooms} />
              <DetailStat label="Maximum Occupancy" value={bedOcc.maxOccupancy} />
              <DetailStat label="Open Beds" value={bedOcc.availableBeds} />
              <DetailStat label="Remaining People Capacity" value={remainingCapacity} />
            </>
          ) : (
            <>
              <DetailStat label="Bedrooms" value={ensured.bedrooms} />
              <DetailStat
                label="Availability"
                value={
                  currentTenants.length > 0 ? 'Fully occupied' : 'Entire home available'
                }
              />
            </>
          )}
          {ensured.unitCount > 1 ? (
            <DetailStat label="Number of Units" value={ensured.unitCount} />
          ) : null}
        </div>

        {surfacesBeds && ensured.bedroomsLayout && ensured.bedroomsLayout.length > 0 ? (
          <div>
            <div className="mb-2 border-b border-line pb-1.5">
              <p className="label-caps">Bedroom &amp; bed map</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                A bed with at least one tenant is occupied. Couples share one bed space for rent.
              </p>
            </div>
            <ul className="space-y-2">
              {ensured.bedroomsLayout.map((room) => (
                <li
                  key={room.id}
                  className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2"
                >
                  <p className="text-sm font-semibold text-ink">{room.label}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {room.beds.map((bed) => {
                      const assignees = bedOcc.tenantsByBedId.get(bed.id) ?? []
                      return (
                        <li key={bed.id} className="text-xs text-ink">
                          <span className="font-medium">
                            {bed.label ?? 'Bed'} · {BED_SIZE_LABELS[bed.size]}
                          </span>
                          <span className="text-ink-muted">
                            {' '}
                            (capacity {bed.capacity})
                          </span>
                          {assignees.length === 0 ? (
                            <span className="ml-1 text-ink-faint">— open</span>
                          ) : (
                            <ul className="mt-0.5 pl-3 text-ink-muted">
                              {assignees.map((t) => (
                                <li key={t.id}>{t.name}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-1.5">
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
            <ul className="space-y-2">
              {currentTenants.map((tenant) => {
                const contract = getContractForClient(tenant.id)
                const leaseStatus = getLeaseStatusDetails(tenant, contract)
                const start =
                  leaseStatus.startDate ||
                  (contract?.startDate?.slice(0, 10) ?? tenant.demoLeaseStartDate?.slice(0, 10))
                const end =
                  leaseStatus.endDate || resolveLeaseEndYmd(tenant, contract)
                const durationMonths = leaseStatus.termMonths ?? tenant.leaseLengthMonths
                const rent = estimateMonthlyRent(
                  tenant,
                  contract,
                  properties,
                  clients,
                  getContractForClient
                )
                const address = getTenantAddress(tenant, contract)
                const wholeUnit = isWholeUnitSingleTenantLease(
                  tenant,
                  ensured,
                  currentTenants
                )
                const bedFound =
                  !wholeUnit && surfacesBeds
                    ? findBedInLayout(
                        ensured.bedroomsLayout,
                        tenant.bedroomId,
                        tenant.bedId
                      )
                    : null

                return (
                  <li
                    key={tenant.id}
                    className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 sm:px-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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
                        {wholeUnit ? (
                          <p className="mt-0.5 text-xs font-medium text-ink">
                            {WHOLE_UNIT_LEASE_LABEL}
                          </p>
                        ) : bedFound ? (
                          <p className="mt-0.5 text-xs font-medium text-ink">
                            {formatBedAssignmentLabel(bedFound.bedroom, bedFound.bed)}
                          </p>
                        ) : tenant.unitOrRoomLabel && surfacesBeds ? (
                          <p className="mt-0.5 text-xs text-ink-muted">{tenant.unitOrRoomLabel}</p>
                        ) : null}
                      </div>
                      <LeaseStatusBadge details={leaseStatus} />
                    </div>

                    <dl className="mt-2 grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
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
                        <dt className="text-ink-faint">
                          {wholeUnit || !surfacesBeds ? 'Monthly rent' : 'Monthly rent share'}
                        </dt>
                        <dd className="mt-0.5 font-medium text-ink">{formatUsd(rent)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Property rent</dt>
                        <dd className="mt-0.5 font-medium text-ink">{formatUsd(unitRent)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Assigned address</dt>
                        <dd className="mt-0.5 break-words font-medium text-ink">{address}</dd>
                      </div>
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
