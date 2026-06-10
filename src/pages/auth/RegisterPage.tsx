import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { expectedWorkEmail, isWorkAdminEmail } from '@/lib/workEmail'
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
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const workEmailHint = useMemo(
    () => (mode === 'admin' ? expectedWorkEmail(name) : null),
    [mode, name]
  )
  const willBeAdmin = useMemo(
    () => mode === 'admin' && Boolean(name && email && isWorkAdminEmail(email, name)),
    [mode, name, email]
  )

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
      await register(name, email, password, {
        accountType: mode,
        portalThemeId: mode === 'client' ? loadStoredPortalThemeId() : undefined,
      })
      const params = new URLSearchParams({ email })
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-ink font-display text-2xl font-bold">
            CC
          </div>
          <h1 className="heading-display text-2xl">
            {mode === 'admin' ? 'Create studio account' : 'Create an account'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'admin'
              ? 'Aspen Creative Solutions team members only — use your work email.'
              : 'Sign up to connect with Aspen Creative Solutions on your project.'}
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </div>
            )}
            {willBeAdmin && (
              <div className="rounded-sm border-2 border-ink bg-surface px-3 py-2 text-sm text-ink">
                Work email detected — you&apos;ll get studio admin access.
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
                  ? workEmailHint
                    ? `Team admin: ${workEmailHint}`
                    : 'Use your aspencreativesolutions.com work email'
                  : 'Use the email your designer has on file'
              }
            />
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

          {mode === 'client' ? (
            <div className="mt-4 flex justify-center">
              <Link to="/studio/register">
                <Button variant="ghost" size="sm" type="button">
                  I&apos;m an Aspen team member
                </Button>
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-ink-muted">
              <Link to="/register" className="font-semibold text-brand hover:underline">
                Client sign up
              </Link>
            </p>
          )}
        </Card>
      </div>
      </div>

      {mode === 'client' && <PaymentPartnerLogos />}
    </div>
  )
}
