import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bell, Eye, KeyRound, Plus, Send, FileText, Trash2, Users, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import {
  fetchLandlordCompanies,
  fetchTenantInviteByCode,
  type LandlordPropertyDetail,
  type PublicTenantInvite,
} from '@/lib/authApi'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  earliestFutureLeaseStartDate,
  formatLeaseLengthLabel,
  isFutureLeaseStartDate,
  LEASE_LENGTH_OPTIONS,
  resolveScheduleAsOf,
  type LeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { claimPortalInvite, submitPortalApplication } from '@/lib/portalApplicationApi'
import { requestPostApplyDemoTip } from '@/lib/publicDemo'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import type { PaymentProvider, PortalDashboard } from '@/types'

type AgencyOption = {
  name: string
  properties: string[]
  propertyDetails?: LandlordPropertyDetail[]
}

type OccupancyMode = 'full_rent' | 'roommates'

type PanelMode = 'choice' | 'apply' | 'invite' | 'sent'

interface PortalApplicationPanelProps {
  data: PortalDashboard
  onUpdated: (next: PortalDashboard) => void
}

export function PortalApplicationPanel({ data, onUpdated }: PortalApplicationPanelProps) {
  const { user } = useAuth()
  const submitted = Boolean(data.applicationSubmitted && data.application)
  const [mode, setMode] = useState<PanelMode>(submitted ? 'sent' : 'choice')
  const [viewOpen, setViewOpen] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const [landlordCompany, setLandlordCompany] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [preferredLeaseMonths, setPreferredLeaseMonths] = useState<LeaseLengthMonths>(
    DEFAULT_LEASE_LENGTH_MONTHS
  )
  const [occupancyMode, setOccupancyMode] = useState<OccupancyMode>('full_rent')
  const [roommatePhones, setRoommatePhones] = useState<string[]>([''])

  const [inviteCode, setInviteCode] = useState('')
  const [invite, setInvite] = useState<PublicTenantInvite | null>(null)
  const [inviteToken, setInviteToken] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  const [leaseStartDate, setLeaseStartDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('stripe')

  useEffect(() => {
    if (submitted) setMode('sent')
  }, [submitted])

  useEffect(() => {
    let cancelled = false
    void fetchLandlordCompanies()
      .then((payload) => {
        if (cancelled) return
        const list =
          payload.agencies?.length > 0
            ? payload.agencies
            : (payload.companies ?? []).map((name) => ({ name, properties: [] as string[] }))
        setAgencies(list)
      })
      .catch(() => {
        if (!cancelled) setAgencies([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const agencyNames = useMemo(() => agencies.map((a) => a.name), [agencies])
  const selectedAgency = useMemo(
    () =>
      agencies.find((a) => a.name.toLowerCase() === landlordCompany.trim().toLowerCase()) ??
      null,
    [agencies, landlordCompany]
  )
  const propertyOptions = useMemo(() => selectedAgency?.properties ?? [], [selectedAgency])
  const selectedOccupancy = useMemo(() => {
    if (!propertyAddress.trim() || !selectedAgency?.propertyDetails?.length) return null
    return (
      selectedAgency.propertyDetails.find(
        (detail) =>
          detail.address.trim().toLowerCase() === propertyAddress.trim().toLowerCase()
      ) ?? null
    )
  }, [propertyAddress, selectedAgency])
  const maxRoommateInvites = Math.max(0, (selectedOccupancy?.availableSpots ?? 0) - 1)

  useEffect(() => {
    if (occupancyMode !== 'roommates') return
    setRoommatePhones((prev) => {
      if (maxRoommateInvites <= 0) return []
      if (prev.length === 0) return ['']
      if (prev.length > maxRoommateInvites) return prev.slice(0, maxRoommateInvites)
      return prev
    })
  }, [occupancyMode, maxRoommateInvites])

  const invitePropertyOptions = useMemo(() => {
    const fromAgency = invite?.agency?.properties ?? []
    if (invite?.propertyAddress && !fromAgency.includes(invite.propertyAddress)) {
      return [invite.propertyAddress, ...fromAgency]
    }
    return fromAgency
  }, [invite])

  const resetApplyForm = () => {
    setLandlordCompany('')
    setPropertyAddress('')
    setPreferredLeaseMonths(DEFAULT_LEASE_LENGTH_MONTHS)
    setOccupancyMode('full_rent')
    setRoommatePhones([''])
    setError('')
  }

  const resetInviteForm = () => {
    setInviteCode('')
    setInvite(null)
    setInviteToken('')
    setPropertyAddress('')
    setLeaseStartDate('')
    setPaymentMethod('stripe')
    setError('')
  }

  const handleAgencyChange = (name: string) => {
    setLandlordCompany(name)
    setPropertyAddress('')
    setOccupancyMode('full_rent')
    setRoommatePhones([''])
  }

  const handlePropertyChange = (address: string) => {
    setPropertyAddress(address)
    setOccupancyMode('full_rent')
    setRoommatePhones([''])
  }

  const handleLookupInvite = async () => {
    setError('')
    const code = inviteCode.trim()
    if (!code) {
      setError('Enter an invite code.')
      return
    }
    setCodeBusy(true)
    try {
      const payload = await fetchTenantInviteByCode(code)
      setInvite(payload)
      setInviteToken(payload.inviteToken ?? '')
      setLandlordCompany(payload.landlordCompany)
      setPropertyAddress(payload.propertyAddress ?? '')
      setPreferredLeaseMonths(
        (payload.leaseLengthMonths as LeaseLengthMonths) || DEFAULT_LEASE_LENGTH_MONTHS
      )
      setLeaseStartDate(
        payload.leaseStartDate &&
          isFutureLeaseStartDate(payload.leaseStartDate, resolveScheduleAsOf())
          ? payload.leaseStartDate
          : earliestFutureLeaseStartDate(resolveScheduleAsOf())
      )
      if (payload.agency?.name) {
        setAgencies((prev) => {
          const without = prev.filter(
            (agency) => agency.name.toLowerCase() !== payload.agency!.name.toLowerCase()
          )
          return [
            {
              name: payload.agency!.name,
              properties: payload.agency!.properties ?? [],
              propertyDetails: payload.agency!.propertyDetails,
            },
            ...without,
          ]
        })
      }
    } catch (err) {
      setInvite(null)
      setError(err instanceof ApiError ? err.message : 'Could not verify that invite code')
    } finally {
      setCodeBusy(false)
    }
  }

  const finishSubmit = (next: PortalDashboard) => {
    onUpdated(next)
    setMode('sent')
    setViewOpen(false)
    requestPostApplyDemoTip(
      user?.email ?? next.application?.email,
      user?.name ?? next.application?.name
    )
  }

  const handleSendApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!landlordCompany.trim() || !propertyAddress.trim()) {
      setError('Select a landlord and property address.')
      return
    }
    const phones =
      occupancyMode === 'roommates'
        ? roommatePhones.map((phone) => phone.trim()).filter(Boolean)
        : []
    if (occupancyMode === 'roommates' && phones.length > maxRoommateInvites) {
      setError(
        maxRoommateInvites === 0
          ? 'This rental only has one open spot — choose Pay full rent instead.'
          : `You can invite at most ${maxRoommateInvites} roommate${maxRoommateInvites === 1 ? '' : 's'}.`
      )
      return
    }
    for (const phone of phones) {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 10) {
        setError('Enter a valid 10-digit phone number for each roommate invite.')
        return
      }
    }
    setSubmitting(true)
    try {
      const next = await submitPortalApplication({
        preferredLandlordCompany: landlordCompany.trim(),
        preferredPropertyAddress: propertyAddress.trim(),
        preferredLeaseMonths,
        preferredOccupancyMode: occupancyMode,
        roommateInvitePhones: phones,
      })
      finishSubmit(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendInviteClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!invite) {
      setError('Look up a valid invite code first.')
      return
    }
    if (!propertyAddress.trim()) {
      setError('Confirm the property for this invite.')
      return
    }
    if (leaseStartDate && !isFutureLeaseStartDate(leaseStartDate, resolveScheduleAsOf())) {
      setError('Lease start date must be a future date.')
      return
    }
    setSubmitting(true)
    try {
      const next = await claimPortalInvite({
        inviteToken: inviteToken || undefined,
        connectionCode: !inviteToken ? inviteCode.trim() || invite.connectionCode || undefined : undefined,
        preferredPropertyAddress: propertyAddress.trim(),
        preferredLeaseStartDate: leaseStartDate || undefined,
        preferredLeaseMonths,
        preferredPaymentMethod: paymentMethod,
      })
      finishSubmit(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your application')
    } finally {
      setSubmitting(false)
    }
  }

  const companyName =
    data.application?.preferredLandlordCompany?.trim() || 'your landlord'

  if (mode === 'sent' && data.application) {
    return (
      <div className="paper-box mt-4 w-full px-4 py-8 text-center sm:px-8 sm:py-10">
        <p className="text-lg font-semibold text-ink sm:text-xl">
          Application sent to {companyName}!
        </p>
        <p className="mt-4 text-sm text-ink sm:text-base">
          Once approved by your landlord, your lease agreement will appear here.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewOpen((open) => !open)}
            aria-expanded={viewOpen}
          >
            <Eye className="h-4 w-4" aria-hidden />
            {viewOpen ? 'Hide Application' : 'View Application'}
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Enable Notifications"
            title="Notifications will be configured later"
          >
            <Bell className="h-4 w-4" aria-hidden />
            Enable Notifications
          </Button>
        </div>
        {viewOpen ? (
          <dl className="mx-auto mt-6 max-w-md space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-4 text-left text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                Landlord
              </dt>
              <dd className="mt-0.5 text-ink">{data.application.preferredLandlordCompany}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                Property
              </dt>
              <dd className="mt-0.5 text-ink">{data.application.preferredPropertyAddress}</dd>
            </div>
            {data.application.preferredLeaseMonths != null ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                  Preferred lease length
                </dt>
                <dd className="mt-0.5 text-ink">
                  {formatLeaseLengthLabel(data.application.preferredLeaseMonths)}
                </dd>
              </div>
            ) : null}
            {data.application.preferredLeaseStartDate ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                  Preferred lease start
                </dt>
                <dd className="mt-0.5 text-ink">{data.application.preferredLeaseStartDate}</dd>
              </div>
            ) : null}
            {data.application.preferredPaymentMethod ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                  Payment method
                </dt>
                <dd className="mt-0.5 text-ink">
                  {paymentProviderLabel(data.application.preferredPaymentMethod)}
                </dd>
              </div>
            ) : null}
            {data.application.preferredOccupancyMode ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                  Occupancy
                </dt>
                <dd className="mt-0.5 text-ink">
                  {data.application.preferredOccupancyMode === 'roommates'
                    ? 'Live with roommates'
                    : 'Pay full rent'}
                </dd>
              </div>
            ) : null}
            {data.application.roommateInvitePhones &&
            data.application.roommateInvitePhones.length > 0 ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                  Roommate invites sent
                </dt>
                <dd className="mt-0.5 text-ink">
                  {data.application.roommateInvitePhones.join(', ')}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    )
  }

  if (mode === 'choice') {
    return (
      <div className="paper-box mt-4 w-full px-4 py-8 text-center sm:px-8 sm:py-10">
        <p className="text-lg font-semibold text-ink sm:text-xl">Connect with a landlord</p>
        <p className="mt-3 text-sm text-ink-muted sm:text-base">
          Start a new application from scratch, or enter an invite code your landlord sent you.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() => {
              resetApplyForm()
              setMode('apply')
            }}
          >
            <FileText className="h-4 w-4" aria-hidden />
            Start Application
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetInviteForm()
              setMode('invite')
            }}
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            Enter invite code
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'invite') {
    const minStartDate = earliestFutureLeaseStartDate(resolveScheduleAsOf())
    return (
      <div className="paper-box mt-4 w-full px-4 py-6 text-left sm:px-8 sm:py-8">
        <button
          type="button"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-caps text-ink-muted transition-colors hover:text-ink"
          onClick={() => {
            resetInviteForm()
            setMode('choice')
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h2 className="heading-display text-xl text-ink sm:text-2xl">Enter invite code</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Use the code from your landlord’s invite text or email to pre-fill their company and
          property.
        </p>
        {error ? (
          <div className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              autoComplete="off"
              className="font-mono tracking-widest"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={codeBusy || !inviteCode.trim()}
            onClick={() => void handleLookupInvite()}
          >
            {codeBusy ? 'Checking…' : 'Apply code'}
          </Button>
        </div>
        {invite ? (
          <form onSubmit={handleSendInviteClaim} className="mt-6 space-y-4">
            <SearchableSelect
              label="Landlord"
              name="inviteLandlordCompany"
              value={landlordCompany}
              options={[landlordCompany]}
              onChange={() => {}}
              required
              disabled
              hint="Pre-filled from your invite"
            />
            <SearchableSelect
              label="Desired Address"
              name="invitePropertyAddress"
              value={propertyAddress}
              options={
                invite.propertyAddress
                  ? [
                      invite.propertyAddress,
                      ...invitePropertyOptions.filter((a) => a !== invite.propertyAddress),
                    ]
                  : invitePropertyOptions
              }
              onChange={setPropertyAddress}
              required
              disabled={Boolean(invite.propertyAddress)}
              placeholder="Select a property"
              emptyMessage="No available properties for this invite"
            />
            <Select
              label="Preferred lease length"
              name="inviteLeaseMonths"
              value={String(preferredLeaseMonths)}
              onChange={(e) =>
                setPreferredLeaseMonths(Number(e.target.value) as LeaseLengthMonths)
              }
              required
              disabled={invite.leaseLengthMonths != null}
            >
              {LEASE_LENGTH_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  {formatLeaseLengthLabel(months)}
                </option>
              ))}
            </Select>
            <Input
              label="Preferred lease start"
              type="date"
              value={leaseStartDate}
              min={minStartDate}
              onChange={(e) => setLeaseStartDate(e.target.value)}
              required
            />
            <Select
              label="Preferred payment method"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentProvider)}
            >
              {(['stripe', 'paypal', 'square'] as PaymentProvider[]).map((provider) => (
                <option key={provider} value={provider}>
                  {paymentProviderLabel(provider)}
                </option>
              ))}
            </Select>
            <Button type="submit" className="w-full" disabled={submitting}>
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? 'Sending…' : 'Send'}
            </Button>
          </form>
        ) : null}
      </div>
    )
  }

  // mode === 'apply'
  return (
    <div className="paper-box mt-4 w-full px-4 py-6 text-left sm:px-8 sm:py-8">
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-caps text-ink-muted transition-colors hover:text-ink"
        onClick={() => {
          resetApplyForm()
          setMode('choice')
        }}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back
      </button>
      <h2 className="heading-display text-xl text-ink sm:text-2xl">Start Application</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Choose your landlord, select an available address, then send your application for review.
      </p>
      {error ? (
        <div className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </div>
      ) : null}
      <form onSubmit={handleSendApplication} className="mt-6 space-y-4">
        <SearchableSelect
          label="Landlord company"
          name="preferredLandlordCompany"
          value={landlordCompany}
          options={agencyNames}
          onChange={handleAgencyChange}
          required
          placeholder="Start typing a company name…"
          hint="All companies available for public discovery"
          emptyMessage="No matching companies"
        />
        <SearchableSelect
          label="Desired Address"
          name="preferredPropertyAddress"
          value={propertyAddress}
          options={propertyOptions}
          onChange={handlePropertyChange}
          required
          disabled={!landlordCompany.trim()}
          placeholder={
            landlordCompany.trim()
              ? 'Start typing a property address…'
              : 'Select a landlord first'
          }
          hint="Addresses listed for the selected landlord"
          emptyMessage="No available properties found for this company"
        />
        <Select
          label="Preferred lease length"
          name="preferredLeaseMonths"
          value={String(preferredLeaseMonths)}
          onChange={(e) => setPreferredLeaseMonths(Number(e.target.value) as LeaseLengthMonths)}
          required
          hint="Your landlord will use this when drafting your lease agreement"
        >
          {LEASE_LENGTH_OPTIONS.map((months) => (
            <option key={months} value={months}>
              {formatLeaseLengthLabel(months)}
            </option>
          ))}
        </Select>

        {propertyAddress.trim() ? (
          <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-caps text-ink-muted">
              How will you occupy this rental?
            </p>
            {selectedOccupancy ? (
              <p className="text-sm text-ink-muted">
                This rental accommodates up to{' '}
                <span className="font-semibold text-ink">{selectedOccupancy.maxTenants}</span>{' '}
                {selectedOccupancy.maxTenants === 1 ? 'person' : 'people'}
                {selectedOccupancy.occupied > 0
                  ? ` · ${selectedOccupancy.occupied} already placed`
                  : null}
                {' · '}
                <span className="font-semibold text-ink">
                  {selectedOccupancy.availableSpots}{' '}
                  {selectedOccupancy.availableSpots === 1 ? 'spot' : 'spots'} open
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">
                Occupancy limits come from the landlord’s rental details once an address is
                selected.
              </p>
            )}
            <div
              role="group"
              aria-label="Occupancy preference"
              className="grid gap-2 sm:grid-cols-2"
            >
              <button
                type="button"
                aria-pressed={occupancyMode === 'full_rent'}
                onClick={() => {
                  setOccupancyMode('full_rent')
                  setRoommatePhones([''])
                }}
                className={
                  occupancyMode === 'full_rent'
                    ? 'flex items-start gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-brand/5 px-3 py-3 text-left'
                    : 'flex items-start gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-3 text-left hover:border-brand/40'
                }
              >
                <Home className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-ink">Pay full rent</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    You’ll cover the full rent for this rental.
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={occupancyMode === 'roommates'}
                disabled={(selectedOccupancy?.availableSpots ?? 0) < 2}
                onClick={() => setOccupancyMode('roommates')}
                className={
                  occupancyMode === 'roommates'
                    ? 'flex items-start gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-brand/5 px-3 py-3 text-left disabled:opacity-50'
                    : 'flex items-start gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-3 text-left hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50'
                }
              >
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-ink">Live with roommates</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {(selectedOccupancy?.availableSpots ?? 0) < 2
                      ? 'Needs at least 2 open spots.'
                      : `Invite up to ${maxRoommateInvites} friend${maxRoommateInvites === 1 ? '' : 's'}.`}
                  </span>
                </span>
              </button>
            </div>

            {occupancyMode === 'roommates' ? (
              <div className="space-y-3 border-t border-line pt-3">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{selectedOccupancy?.availableSpots ?? 0}</span>{' '}
                  {(selectedOccupancy?.availableSpots ?? 0) === 1 ? 'spot' : 'spots'} available
                  (including you). Text invite links to friends for the remaining openings.
                </p>
                {maxRoommateInvites === 0 ? (
                  <p className="text-sm text-accent">
                    Only one open spot — you can’t invite roommates for this rental.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {roommatePhones.map((phone, index) => (
                      <div key={`roommate-${index}`} className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Input
                            label={`Roommate ${index + 1} phone`}
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              const next = [...roommatePhones]
                              next[index] = e.target.value
                              setRoommatePhones(next)
                            }}
                            placeholder="e.g. 5551234567"
                            autoComplete="tel"
                          />
                        </div>
                        {roommatePhones.length > 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="mb-[2px] shrink-0"
                            aria-label={`Remove roommate ${index + 1}`}
                            onClick={() =>
                              setRoommatePhones((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {roommatePhones.length < maxRoommateInvites ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRoommatePhones((prev) => [...prev, ''])}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Add another roommate
                      </Button>
                    ) : null}
                    <p className="text-[11px] text-ink-muted">
                      Phone numbers are optional — leave blank if you’ll invite later. Each filled
                      number gets a one-time invite link by text.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          <Send className="h-4 w-4" aria-hidden />
          {submitting ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  )
}
