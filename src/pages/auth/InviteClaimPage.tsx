import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Home, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useAuth } from '@/context/AuthContext'
import { ApiError, setToken } from '@/lib/api'
import {
  claimTenantInvite,
  fetchTenantInvite,
  fetchTenantInviteByCode,
  type PublicTenantInvite,
} from '@/lib/authApi'
import {
  earliestFutureLeaseStartDate,
  formatLeaseLengthLabel,
  isFutureLeaseStartDate,
  resolveScheduleAsOf,
} from '@/lib/leaseSchedule'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import type { PaymentProvider } from '@/types'

const PAYMENT_OPTIONS: PaymentProvider[] = ['stripe', 'paypal', 'square']

export function InviteClaimPage() {
  const { token: tokenParam } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const codeParam = searchParams.get('code')?.trim() || ''
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [invite, setInvite] = useState<PublicTenantInvite | null>(null)
  const [inviteToken, setInviteToken] = useState(tokenParam || '')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [leaseStartDate, setLeaseStartDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('stripe')

  const minStartDate = earliestFutureLeaseStartDate(resolveScheduleAsOf())
  const propertyLocked = Boolean(invite?.propertyAddress)

  const propertyOptions = useMemo(() => {
    const fromAgency = invite?.agency?.properties ?? []
    if (invite?.propertyAddress && !fromAgency.includes(invite.propertyAddress)) {
      return [invite.propertyAddress, ...fromAgency]
    }
    return fromAgency
  }, [invite])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    const load = tokenParam
      ? fetchTenantInvite(tokenParam).then((data) => {
          if (cancelled) return
          setInvite(data)
          setInviteToken(tokenParam)
          setPropertyAddress(data.propertyAddress ?? '')
          setLeaseStartDate(
            data.leaseStartDate && isFutureLeaseStartDate(data.leaseStartDate, resolveScheduleAsOf())
              ? data.leaseStartDate
              : earliestFutureLeaseStartDate(resolveScheduleAsOf())
          )
        })
      : codeParam
        ? fetchTenantInviteByCode(codeParam).then((data) => {
            if (cancelled) return
            setInvite(data)
            setInviteToken(data.inviteToken ?? '')
            setPropertyAddress(data.propertyAddress ?? '')
            setLeaseStartDate(
              data.leaseStartDate &&
                isFutureLeaseStartDate(data.leaseStartDate, resolveScheduleAsOf())
                ? data.leaseStartDate
                : earliestFutureLeaseStartDate(resolveScheduleAsOf())
            )
          })
        : Promise.reject(new Error('Missing invite'))

    void load
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'This invite link is invalid or has expired'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tokenParam, codeParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim()) {
      setError('Enter your name and email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!propertyAddress.trim()) {
      setError('Confirm the property for this invite.')
      return
    }
    if (!isFutureLeaseStartDate(leaseStartDate, resolveScheduleAsOf())) {
      setError('Lease start date must be a future date.')
      return
    }

    setSubmitting(true)
    try {
      const result = await claimTenantInvite({
        inviteToken: inviteToken || undefined,
        connectionCode: !inviteToken ? codeParam || invite?.connectionCode || undefined : undefined,
        name: name.trim(),
        email: email.trim(),
        password,
        preferredPropertyAddress: propertyAddress.trim(),
        preferredLeaseStartDate: leaseStartDate,
        preferredPaymentMethod: paymentMethod,
      })
      setToken(result.token)
      await refreshUser()
      navigate('/portal', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your details')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    )
  }

  if (loadError || !invite) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4">
        <div className="paper-box w-full max-w-md px-6 py-8 text-center">
          <h1 className="heading-display text-2xl">Invite unavailable</h1>
          <p className="mt-3 text-sm text-ink-muted">{loadError || 'This invite is no longer valid.'}</p>
          <Link to="/welcome" className="mt-6 inline-block text-sm font-semibold text-brand">
            Back to welcome
          </Link>
        </div>
      </div>
    )
  }

  const company = invite.landlordCompany
  const durationLabel =
    invite.leaseLengthMonths != null
      ? formatLeaseLengthLabel(invite.leaseLengthMonths)
      : null

  return (
    <div className="min-h-dvh bg-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <p className="label-caps text-ink-muted">Tenant invite</p>
          <h1 className="heading-display mt-1 text-3xl sm:text-4xl">{company}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Confirm your rental details below — no account signup required. After you submit,
            your landlord will see you under Waiting to Connect.
          </p>
        </div>

        <div className="paper-box mb-4 flex items-start gap-3 px-4 py-3 sm:px-5">
          <Home className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Pre-filled from your invite</p>
            <p className="mt-1 text-sm text-ink-muted">
              {propertyLocked ? propertyAddress : 'Choose your property'}
              {durationLabel ? ` · ${durationLabel}` : ''}
              {invite.connectionCode ? ` · Code ${invite.connectionCode}` : ''}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="paper-box space-y-4 px-4 py-5 sm:px-6 sm:py-6"
        >
          {error && (
            <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}

          {propertyLocked ? (
            <Input
              label="Property"
              name="propertyAddress"
              value={propertyAddress}
              readOnly
              required
            />
          ) : (
            <SearchableSelect
              label="Property"
              name="propertyAddress"
              required
              options={propertyOptions}
              value={propertyAddress}
              onChange={setPropertyAddress}
              placeholder="Confirm your rental…"
              emptyMessage="No properties available"
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              name="name"
              required
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              required
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Used to sign back into your portal later"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Lease Start Date"
              name="leaseStartDate"
              type="date"
              required
              min={minStartDate}
              value={leaseStartDate}
              onChange={(e) => setLeaseStartDate(e.target.value)}
              hint="Future dates only"
            />
            <Select
              label="Payment Method"
              name="paymentMethod"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentProvider)}
            >
              {PAYMENT_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>
                  {paymentProviderLabel(provider)}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting ? 'Submitting…' : 'Submit for landlord approval'}
          </Button>
        </form>
      </div>
    </div>
  )
}
