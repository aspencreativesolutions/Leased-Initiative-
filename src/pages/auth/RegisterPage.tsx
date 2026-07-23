import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { fetchLandlordCompanies, fetchTenantInvite } from '@/lib/authApi'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  formatLeaseLengthLabel,
  LEASE_LENGTH_OPTIONS,
  type LeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { loadStoredPortalThemeId } from '@/themes/applyTheme'
import { PaymentPartnerLogos } from '@/components/auth/PaymentPartnerLogos'

interface AgencyOption {
  name: string
  properties: string[]
}

interface RegisterPageProps {
  mode?: 'client' | 'admin'
  loginPath?: string
}

export function RegisterPage({ mode = 'client', loginPath }: RegisterPageProps) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = mode === 'client' ? searchParams.get('invite')?.trim() || '' : ''

  const resolvedLoginPath = loginPath ?? (mode === 'admin' ? '/studio/login' : '/login')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferredLeaseMonths, setPreferredLeaseMonths] = useState<LeaseLengthMonths>(
    DEFAULT_LEASE_LENGTH_MONTHS
  )
  const [landlordCompany, setLandlordCompany] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const [inviteLocked, setInviteLocked] = useState(false)
  const [invitePropertyLocked, setInvitePropertyLocked] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (mode !== 'client') return
    let cancelled = false
    void fetchLandlordCompanies()
      .then((data) => {
        if (cancelled) return
        const list =
          data.agencies?.length > 0
            ? data.agencies
            : (data.companies ?? []).map((name) => ({ name, properties: [] as string[] }))
        setAgencies(list)
      })
      .catch(() => {
        if (!cancelled) setAgencies([])
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'client' || !inviteToken) return
    let cancelled = false
    void fetchTenantInvite(inviteToken)
      .then((invite) => {
        if (cancelled) return
        setLandlordCompany(invite.landlordCompany)
        if (invite.propertyAddress) {
          setPropertyAddress(invite.propertyAddress)
          setInvitePropertyLocked(true)
        } else {
          setPropertyAddress('')
          setInvitePropertyLocked(false)
        }
        setInviteLocked(true)
        setInviteError('')
      })
      .catch((err) => {
        if (cancelled) return
        setInviteError(
          err instanceof ApiError ? err.message : 'This invite link is invalid or has expired'
        )
        setInviteLocked(false)
        setInvitePropertyLocked(false)
      })
    return () => {
      cancelled = true
    }
  }, [inviteToken, mode])

  const agencyNames = useMemo(() => agencies.map((agency) => agency.name), [agencies])

  const propertyOptions = useMemo(() => {
    const selected = agencies.find(
      (agency) => agency.name.toLowerCase() === landlordCompany.trim().toLowerCase()
    )
    if (selected?.properties?.length) return selected.properties
    const all = new Set<string>()
    for (const agency of agencies) {
      for (const address of agency.properties) all.add(address)
    }
    return [...all].sort((a, b) => a.localeCompare(b))
  }, [agencies, landlordCompany])

  const handleAgencyChange = (value: string) => {
    if (inviteLocked) return
    setLandlordCompany(value)
    setPropertyAddress('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (mode === 'admin' && !companyName.trim()) {
      setError('Company name is required')
      return
    }
    if (mode === 'client' && inviteError) {
      setError(inviteError)
      return
    }
    if (mode === 'client' && !landlordCompany.trim()) {
      setError('Select an agency from the list')
      return
    }
    if (
      mode === 'client' &&
      !inviteLocked &&
      !agencyNames.some((name) => name === landlordCompany.trim())
    ) {
      setError('Select an agency from the suggestions')
      return
    }
    if (mode === 'client' && !propertyAddress.trim()) {
      setError('Select a property')
      return
    }
    if (
      mode === 'client' &&
      propertyOptions.length > 0 &&
      !propertyOptions.includes(propertyAddress.trim())
    ) {
      setError('Select a property from the list')
      return
    }

    setSubmitting(true)
    try {
      const { email: registeredEmail } = await register(name, email, password, {
        accountType: mode,
        companyName: mode === 'admin' ? companyName.trim() : undefined,
        portalThemeId: mode === 'client' ? loadStoredPortalThemeId() : undefined,
        preferredLeaseMonths: mode === 'client' ? preferredLeaseMonths : undefined,
        preferredLandlordCompany: mode === 'client' ? landlordCompany.trim() : undefined,
        preferredPropertyAddress: mode === 'client' ? propertyAddress.trim() : undefined,
        inviteToken: mode === 'client' && inviteToken ? inviteToken : undefined,
      })
      const params = new URLSearchParams({ email: registeredEmail })
      if (mode === 'admin') params.set('studio', '1')
      navigate(`/check-email?${params.toString()}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink font-display text-2xl font-bold">
            L
          </div>
          <h1 className="heading-display text-2xl">
            {mode === 'admin' ? 'Create landlord account' : 'Create tenant account'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'admin'
              ? 'Sign up with your company name and email to manage tenants and lease agreements.'
              : inviteLocked
                ? `You’re joining ${landlordCompany}. Choose a property, then finish creating your account.`
                : 'Select your agency and property. After approval, you can review and sign your lease agreement.'}
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || inviteError) && (
              <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error || inviteError}
              </div>
            )}
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            {mode === 'admin' && (
              <Input
                label="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
                hint="This becomes your registered company name and cannot be changed later without a special request."
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              hint={
                mode === 'admin'
                  ? 'Use any email address you check regularly'
                  : 'Use the email your landlord has on file'
              }
            />
            {mode === 'client' && (
              <>
                <SearchableSelect
                  label="Type Agency"
                  name="preferredLandlordCompany"
                  value={landlordCompany}
                  options={agencyNames}
                  onChange={handleAgencyChange}
                  required
                  disabled={inviteLocked}
                  placeholder="Start typing an agency name…"
                  hint={
                    inviteLocked
                      ? 'Pre-filled from your invite link'
                      : 'Search and select your landlord or agency'
                  }
                  emptyMessage="No matching agencies"
                />
                <SearchableSelect
                  label="Desired Address"
                  name="preferredPropertyAddress"
                  value={propertyAddress}
                  options={
                    invitePropertyLocked && propertyAddress
                      ? [propertyAddress, ...propertyOptions.filter((a) => a !== propertyAddress)]
                      : propertyOptions
                  }
                  onChange={setPropertyAddress}
                  required
                  disabled={!landlordCompany.trim() || invitePropertyLocked}
                  placeholder={
                    landlordCompany.trim()
                      ? 'Start typing a property address…'
                      : 'Select an agency first'
                  }
                  hint={
                    invitePropertyLocked
                      ? 'Pre-filled from your invite link for this opening'
                      : inviteLocked
                        ? 'Choose the property you’re interested in from this company’s list'
                        : 'All listed properties are shown — availability is confirmed after approval'
                  }
                  emptyMessage="No properties found for this agency"
                />
                <Select
                  label="Preferred lease length"
                  name="preferredLeaseMonths"
                  value={String(preferredLeaseMonths)}
                  onChange={(e) =>
                    setPreferredLeaseMonths(Number(e.target.value) as LeaseLengthMonths)
                  }
                  required
                  hint="Your landlord will use this when drafting your lease agreement"
                >
                  {LEASE_LENGTH_OPTIONS.map((months) => (
                    <option key={months} value={months}>
                      {formatLeaseLengthLabel(months)}
                    </option>
                  ))}
                </Select>
              </>
            )}
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              hint="At least 8 characters"
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={submitting || Boolean(inviteError)}>
              <UserPlus className="h-4 w-4" />
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to={resolvedLoginPath} className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link to="/" className="font-semibold text-brand hover:underline">
              Back to home
            </Link>
          </p>
        </Card>

        {mode === 'client' && <PaymentPartnerLogos />}
      </div>
      </div>
    </div>
  )
}
