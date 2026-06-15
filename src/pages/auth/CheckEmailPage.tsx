import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError } from '@/lib/api'
import { resendVerificationEmail } from '@/lib/authApi'

export function CheckEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const loginPath = searchParams.get('studio') === '1' ? '/studio/login' : '/login'
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [error, setError] = useState('')

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setError('')
    setResent(false)
    setResendMessage('')
    try {
      const result = await resendVerificationEmail(email)
      setResent(true)
      setResendMessage(result.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-ink font-display text-2xl font-bold">
            CC
          </div>
          <h1 className="heading-display text-2xl">Check your email</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We sent a confirmation link to activate your account.
          </p>
        </div>

        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Mail className="h-6 w-6" />
          </div>

          {email ? (
            <p className="text-sm text-ink">
              Open the link we sent to{' '}
              <span className="font-semibold">{email}</span> to verify your account. The link
              expires in 24 hours.
            </p>
          ) : (
            <p className="text-sm text-ink">
              Open the confirmation link in your inbox to verify your account before signing in.
            </p>
          )}

          <p className="mt-4 text-xs text-ink-muted">
            Didn&apos;t receive it? Check spam, or request a new link below.
          </p>

          {error && (
            <p className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}

          {resent && (
            <p className="mt-4 rounded-sm border-2 border-brand/30 bg-brand/5 px-3 py-2 text-sm text-brand">
              {resendMessage}
            </p>
          )}

          {email && (
            <Button
              className="mt-6 w-full"
              variant="outline"
              disabled={resending}
              onClick={handleResend}
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Resend confirmation email
            </Button>
          )}

          <p className="mt-6 text-sm text-ink-muted">
            <Link to={loginPath} className="font-semibold text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
