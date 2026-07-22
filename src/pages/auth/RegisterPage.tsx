import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  formatLeaseLengthLabel,
  LEASE_LENGTH_OPTIONS,
  type LeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { loadStoredPortalThemeId } from '@/themes/applyTheme'
import { PaymentPartnerLogos } from '@/components/auth/PaymentPartnerLogos'

interface RegisterPageProps {
  mode?: 'client' | 'admin'
  loginPath?: string
}

export function RegisterPage({ mode = 'client', loginPath }: RegisterPageProps) {
  const { register } = useAuth()
  const navigate = useNavigate()

  const resolvedLoginPath = loginPath ?? (mode === 'admin' ? '/studio/login' : '/login')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferredLeaseMonths, setPreferredLeaseMonths] = useState<LeaseLengthMonths>(
    DEFAULT_LEASE_LENGTH_MONTHS
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

    setSubmitting(true)
    try {
      const { email: registeredEmail } = await register(name, email, password, {
        accountType: mode,
        portalThemeId: mode === 'client' ? loadStoredPortalThemeId() : undefined,
        preferredLeaseMonths: mode === 'client' ? preferredLeaseMonths : undefined,
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
              ? 'Sign up with your email to manage tenants and leases.'
              : 'Sign up to connect with your landlord. After approval, you can review and sign your lease.'}
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </div>
            )}
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
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
              <Select
                label="Preferred lease length"
                name="preferredLeaseMonths"
                value={String(preferredLeaseMonths)}
                onChange={(e) =>
                  setPreferredLeaseMonths(Number(e.target.value) as LeaseLengthMonths)
                }
                required
                hint="Your landlord will use this when setting up your lease term"
              >
                {LEASE_LENGTH_OPTIONS.map((months) => (
                  <option key={months} value={months}>
                    {formatLeaseLengthLabel(months)}
                  </option>
                ))}
              </Select>
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
            <Button type="submit" className="w-full" disabled={submitting}>
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
              Back to role selection
            </Link>
          </p>
        </Card>

        {mode === 'client' && <PaymentPartnerLogos />}
      </div>
      </div>
    </div>
  )
}
