import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { ApiError } from '@/lib/api'
import { persistThemeIdAcrossSurfaces, loadStoredThemeId } from '@/themes/applyTheme'
import {
  fetchCompanyDemoLink,
  markPublicDemoSession,
  redeemCompanyDemoLink,
  setDemoFirstName,
} from '@/lib/publicDemo'

type LinkState =
  | { status: 'loading' }
  | { status: 'ready'; companyName: string; expiresAt: string }
  | { status: 'error'; message: string }

export function CompanyDemoLinkPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const firstNameId = useId()
  const [linkState, setLinkState] = useState<LinkState>({ status: 'loading' })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token.trim()) {
      setLinkState({ status: 'error', message: 'This demo link is not valid.' })
      return
    }

    setLinkState({ status: 'loading' })
    fetchCompanyDemoLink(token)
      .then((data) => {
        if (cancelled) return
        setLinkState({
          status: 'ready',
          companyName: data.companyName,
          expiresAt: data.expiresAt,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setLinkState({
          status: 'error',
          message:
            err instanceof ApiError
              ? err.message
              : 'This demo link is not valid or has expired.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleStartDemo = useCallback(async () => {
    if (starting || !token.trim()) return
    setStarting(true)
    setStartError('')
    try {
      await redeemCompanyDemoLink(token)
      markPublicDemoSession()
      setDemoFirstName(firstName)
      // Keep whatever style was already chosen on the public site (or default).
      persistThemeIdAcrossSurfaces(loadStoredThemeId())
      navigate('/demo/pov', { replace: true })
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : 'Could not start the demo'
      )
      setStarting(false)
    }
  }, [firstName, navigate, starting, token])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="home-page__atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <Link
          to="/"
          className="mb-8 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink font-display text-2xl font-bold tracking-tight transition-colors hover:border-brand hover:text-brand sm:h-16 sm:w-16 sm:text-3xl"
          aria-label="Return home"
        >
          L
        </Link>

        {linkState.status === 'loading' ? (
          <div className="flex flex-col items-center gap-3 text-ink-muted">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <p className="text-sm">Checking your demo invite…</p>
          </div>
        ) : linkState.status === 'error' ? (
          <>
            <h1 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl">
              Demo link unavailable
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
              {linkState.message}
            </p>
            <Button type="button" className="mt-8" onClick={() => navigate('/')}>
              Back to home
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Demo invite for {linkState.companyName}
            </p>
            <h1 className="mt-3 heading-display text-3xl font-bold tracking-tight sm:text-4xl">
              See the demo?
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
              Start a guided preview of Leased Initiative. You’ll choose landlord or tenant next —
              nothing you change is saved.
            </p>

            <div className="mt-8 w-full max-w-sm text-left">
              <Input
                id={firstNameId}
                label="First Name (Optional)"
                hint="Enter your first name to personalize mock messages and documents throughout the demo. You can also skip this step."
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                placeholder="e.g. Christine"
                disabled={starting}
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                disabled={starting}
                onClick={() => {
                  void handleStartDemo()
                }}
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {starting ? 'Starting demo…' : 'Yes — Start Demo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={starting}
                onClick={() => navigate('/')}
              >
                Not now
              </Button>
            </div>

            {startError ? (
              <p className="mt-6 text-sm font-medium text-accent" role="alert">
                {startError}
              </p>
            ) : null}

            <p className="mt-8 text-xs text-ink-faint">
              Link expires{' '}
              {new Date(linkState.expiresAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
