import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { PaymentPartnerLogos } from '@/components/auth/PaymentPartnerLogos'
import { resendVerificationEmail } from '@/lib/authApi'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(
    searchParams.get('verify') === '1'
  )
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setResent(false)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      if (user.role !== 'client') {
        setError('This sign-in is for client accounts. Aspen team members should use the studio login.')
        return
      }
      navigate('/portal', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : 'Login failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setResent(false)
    try {
      await resendVerificationEmail(email)
      setResent(true)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend email')
    } finally {
      setResending(false)
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
          <h1 className="heading-display text-2xl">Client Portal</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to work with Aspen Creative Solutions on your project
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </div>
            )}
            {needsVerification && (
              <div className="rounded-sm border-2 border-brand/30 bg-brand/5 px-3 py-3 text-sm text-ink">
                <p>Confirm your email before signing in.</p>
                {resent ? (
                  <p className="mt-2 text-brand">A new verification email has been sent.</p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={resending || !email}
                    onClick={handleResend}
                  >
                    {resending ? 'Sending…' : 'Resend confirmation email'}
                  </Button>
                )}
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
              Create an account
            </Link>
          </p>

          <div className="mt-4 flex justify-center">
            <Link to="/studio/login">
              <Button variant="ghost" size="sm" type="button">
                I&apos;m an Aspen team member
              </Button>
            </Link>
          </div>
        </Card>
        </div>
      </div>

      <PaymentPartnerLogos />
    </div>
  )
}
