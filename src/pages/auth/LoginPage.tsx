import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'client' ? '/portal' : from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-ink font-display text-2xl font-bold">
            CC
          </div>
          <h1 className="heading-display text-2xl">Sign in to Client Craft</h1>
          <p className="mt-2 text-sm text-ink-muted">Admin studio dashboard</p>
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
            Aspen Creative Solutions team?{' '}
            <Link to="/register" className="font-semibold text-brand hover:underline">
              Create admin account
            </Link>
            {' · '}
            <Link to="/portal/register" className="font-semibold text-brand hover:underline">
              Client sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
