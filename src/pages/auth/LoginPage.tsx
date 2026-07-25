import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import {
  isPublicDemoSession,
  shouldRecoverPublicDemoAtHome,
} from '@/lib/publicDemo'

type DemoLoginState = {
  demoCredentials?: { email: string; password: string }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const demoState = (location.state as DemoLoginState | null)?.demoCredentials
  const autoSubmitted = useRef(false)

  const [email, setEmail] = useState(demoState?.email ?? '')
  const [password, setPassword] = useState(demoState?.password ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password, {
        publicDemo: isPublicDemoSession(),
      })
      if (user.role !== 'client') {
        setError('This sign-in is for tenant accounts. Landlords should use landlord sign-in.')
        return
      }
      navigate('/portal', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        const targetEmail = err.email ?? email
        navigate(`/check-email?email=${encodeURIComponent(targetEmail)}`, { replace: true })
        return
      }
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    // Prefill + one-shot auto sign-in after welcome-carousel demo redeem
    if (demoState?.email && demoState?.password && !autoSubmitted.current) {
      autoSubmitted.current = true
      void handleSubmit()
      return
    }
    // Demo refresh / expired session: recover on homepage Quick Access, not this form
    if (!demoState && shouldRecoverPublicDemoAtHome()) {
      navigate('/', { replace: true, state: { openDemoCode: true } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink font-display text-2xl font-bold">
            L
          </div>
          <h1 className="heading-display text-2xl">Tenant sign in</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to review your lease and stay connected with your landlord
          </p>
          {demoState && (
            <p className="mt-3 text-xs font-semibold text-accent">
              Demo credentials filled in — signing you in…
            </p>
          )}
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="h-4 w-4" />
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand hover:underline">
              Create a tenant account
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link to="/" className="font-semibold text-brand hover:underline">
              Back to home
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
