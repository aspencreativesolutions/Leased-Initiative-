import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { ApiError, setToken } from '@/lib/api'
import { verifyEmail } from '@/lib/authApi'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('This verification link is missing or invalid.')
      return
    }

    let cancelled = false

    verifyEmail(token)
      .then((data) => {
        if (cancelled) return
        setToken(data.token)
        refreshUser().then((user) => {
          if (cancelled) return
          setStatus('success')
          const destination = user?.role === 'admin' ? '/studio' : '/portal'
          setTimeout(() => navigate(destination, { replace: true }), 1500)
        })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Could not verify your email')
      })

    return () => {
      cancelled = true
    }
  }, [token, navigate, refreshUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <Card padding="lg" className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
              <h1 className="heading-display mt-4 text-xl">Verifying your email…</h1>
              <p className="mt-2 text-sm text-ink-muted">Just a moment while we confirm your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
              <h1 className="heading-display mt-4 text-xl">Email confirmed</h1>
              <p className="mt-2 text-sm text-ink-muted">Your account is active. Redirecting you now…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-accent" />
              <h1 className="heading-display mt-4 text-xl">Verification failed</h1>
              <p className="mt-2 text-sm text-ink-muted">{error}</p>
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/check-email">
                  <Button className="w-full" variant="outline">
                    Request a new link
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className="w-full" variant="ghost">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
