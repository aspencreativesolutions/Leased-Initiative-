import { useCallback, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  Shield,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { usePortalTheme } from '@/context/PortalThemeContext'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { clearWelcomeCarouselDone, notifyFirstTimeRestart } from '@/lib/welcomeSlides'
import {
  ALL_MOCK_USERS,
  CORE_MOCK_USERS,
  EDGE_MOCK_USERS,
  FIRST_TIME_SCENARIOS,
  getMockPassword,
  homePathForRole,
  isAdminModeEnabled,
  reseedDemoData,
  scenariosForMockUser,
  type AdminMockUser,
  type AdminScenario,
} from '@/lib/adminMode'

const PANEL_KEY = 'leased-admin-mode-open'
const EXPANDED_KEY = 'leased-admin-mode-expanded'

function loadExpanded(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY)
    if (!raw) return { core: true, first: true }
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return { core: true, first: true }
  }
}

export function AdminModeFab() {
  if (!isAdminModeEnabled()) return null
  return <AdminModeFabInner />
}

function AdminModeFabInner() {
  const { user, login, logout } = useAuth()
  const { resetToDefault: resetAppTheme } = useTheme()
  const { resetToDefault: resetPortalTheme } = usePortalTheme()
  const navigate = useNavigate()
  const titleId = useId()
  const [open, setOpen] = useState(() => sessionStorage.getItem(PANEL_KEY) === '1')
  const [expanded, setExpanded] = useState<Record<string, boolean>>(loadExpanded)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const restartAsFirstTime = useCallback(() => {
    clearWelcomeCarouselDone()
    resetAppTheme()
    resetPortalTheme()
    logout()
    notifyFirstTimeRestart()
  }, [logout, resetAppTheme, resetPortalTheme])

  useEffect(() => {
    sessionStorage.setItem(PANEL_KEY, open ? '1' : '0')
  }, [open])

  useEffect(() => {
    sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded))
  }, [expanded])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const runScenario = useCallback(
    async (scenario: AdminScenario) => {
      setBusy(scenario.id)
      setError(null)
      setMessage(null)
      try {
        if (scenario.reseed) {
          await reseedDemoData()
          setMessage('Demo data restored to canonical states.')
        }

        if (!scenario.email) {
          restartAsFirstTime()
          navigate(scenario.path)
          setMessage(`First-time: ${scenario.label}`)
          return
        }

        const password = getMockPassword(scenario.email)
        const nextUser = await login(scenario.email, password)
        navigate(scenario.path || homePathForRole(nextUser.role === 'admin' ? 'admin' : 'client'))
        setMessage(`Viewing as ${nextUser.name} — ${scenario.label}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not run scenario')
      } finally {
        setBusy(null)
      }
    },
    [login, navigate, restartAsFirstTime]
  )

  const enterMockUser = useCallback(
    async (mock: AdminMockUser, options?: { reseed?: boolean }) => {
      setBusy(mock.key)
      setError(null)
      setMessage(null)
      try {
        if (options?.reseed) {
          await reseedDemoData()
        }
        const nextUser = await login(mock.email, getMockPassword(mock.email))
        navigate(homePathForRole(nextUser.role === 'admin' ? 'admin' : 'client'))
        setMessage(`Entered ${mock.label}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not switch user')
      } finally {
        setBusy(null)
      }
    },
    [login, navigate]
  )

  const handleReseedOnly = async () => {
    setBusy('reseed')
    setError(null)
    setMessage(null)
    const previousEmail = user?.email?.trim().toLowerCase()
    const wasMock = Boolean(
      previousEmail && ALL_MOCK_USERS.some((m) => m.email === previousEmail)
    )
    try {
      await reseedDemoData()
      // Reseed recreates demo user ids — refresh the session if we were in a mock POV
      logout()
      if (wasMock && previousEmail) {
        const nextUser = await login(previousEmail, getMockPassword(previousEmail))
        navigate(homePathForRole(nextUser.role === 'admin' ? 'admin' : 'client'))
        setMessage('Mock data restored. Still viewing the same point of view.')
      } else {
        setMessage('All mock journeys restored. Enter a mock user to continue testing.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reseed failed')
    } finally {
      setBusy(null)
    }
  }

  const handleFirstTime = async () => {
    setBusy('first-time')
    setError(null)
    restartAsFirstTime()
    navigate('/')
    setMessage('Restarted as a first-time visitor')
    setBusy(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-4 left-4 z-[90] flex items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-ink px-3 py-2 text-xs font-semibold text-surface shadow-lift transition hover:bg-ink/90',
          open && 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
        )}
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        title="Admin Mode"
      >
        <Shield className="h-3.5 w-3.5" strokeWidth={2.25} />
        Admin
      </button>

      {open && (
        <div
          className="fixed bottom-16 left-4 z-[90] flex max-h-[min(70vh,560px)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <div className="flex items-start justify-between gap-2 border-b-[length:var(--border-width)] border-ink px-4 py-3">
            <div>
              <h2 id={titleId} className="heading-display text-base">
                Admin Mode
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                Test journeys · password = email
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-sm)] p-1 text-ink-muted hover:text-ink"
              aria-label="Close Admin Mode"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              <Button
                type="button"
                size="sm"
                className="w-full justify-start"
                disabled={Boolean(busy)}
                onClick={handleFirstTime}
              >
                {busy === 'first-time' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Restart as first-time user
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full justify-start"
                disabled={Boolean(busy)}
                onClick={handleReseedOnly}
              >
                {busy === 'reseed' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Restore all mock data
              </Button>
            </div>

            <Section
              title="First-time flows"
              open={expanded.first !== false}
              onToggle={() => toggleSection('first')}
            >
              <ul className="space-y-1">
                {FIRST_TIME_SCENARIOS.map((scenario) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={scenario}
                    busy={busy}
                    onRun={runScenario}
                  />
                ))}
              </ul>
            </Section>

            <Section
              title="Core mock users"
              open={expanded.core !== false}
              onToggle={() => toggleSection('core')}
            >
              <div className="space-y-2">
                {CORE_MOCK_USERS.map((mock) => (
                  <MockUserBlock
                    key={mock.key}
                    mock={mock}
                    expanded={expanded[`user:${mock.key}`] === true}
                    onToggle={() => toggleSection(`user:${mock.key}`)}
                    busy={busy}
                    currentEmail={user?.email}
                    onEnter={enterMockUser}
                    onRunScenario={runScenario}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Edge-case tenants"
              open={expanded.edge === true}
              onToggle={() => toggleSection('edge')}
            >
              <div className="space-y-2">
                {EDGE_MOCK_USERS.map((mock) => (
                  <MockUserBlock
                    key={mock.key}
                    mock={mock}
                    expanded={expanded[`user:${mock.key}`] === true}
                    onToggle={() => toggleSection(`user:${mock.key}`)}
                    busy={busy}
                    currentEmail={user?.email}
                    onEnter={enterMockUser}
                    onRunScenario={runScenario}
                  />
                ))}
              </div>
            </Section>
          </div>

          <div className="border-t-[length:var(--border-width)] border-ink px-3 py-2">
            <p className="truncate text-[10px] text-ink-faint">
              {user ? (
                <>
                  Signed in as <span className="text-ink-muted">{user.email}</span>
                </>
              ) : (
                'Signed out'
              )}
            </p>
            {message && <p className="mt-1 text-[11px] text-accent">{message}</p>}
            {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="paper-box-inset overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-[11px] font-semibold text-ink"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
        )}
        {title}
      </button>
      {open && <div className="border-t border-[var(--card-inset-border,var(--line))] px-2 pb-2 pt-1.5">{children}</div>}
    </div>
  )
}

function MockUserBlock({
  mock,
  expanded,
  onToggle,
  busy,
  currentEmail,
  onEnter,
  onRunScenario,
}: {
  mock: AdminMockUser
  expanded: boolean
  onToggle: () => void
  busy: string | null
  currentEmail?: string
  onEnter: (mock: AdminMockUser, options?: { reseed?: boolean }) => Promise<void>
  onRunScenario: (scenario: AdminScenario) => Promise<void>
}) {
  const scenarios = scenariosForMockUser(mock)
  const isCurrent = currentEmail?.toLowerCase() === mock.email.toLowerCase()

  return (
    <div
      className={cn(
        'rounded-[var(--radius-sm)] border border-[var(--card-inset-border,var(--line))] bg-surface px-2 py-1.5',
        isCurrent && 'border-accent'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-1.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <UserRound className="h-3 w-3 shrink-0 text-ink-muted" />
            {mock.label}
            {isCurrent && (
              <span className="rounded-sm bg-accent/15 px-1 py-0.5 text-[9px] font-semibold text-accent">
                Now
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">
            {mock.description}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-[var(--card-inset-border,var(--line))] pt-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => onEnter(mock, { reseed: mock.group === 'core' })}
            className="flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] bg-ink px-2 py-1.5 text-left text-[10px] font-semibold text-surface disabled:opacity-40"
          >
            {busy === mock.key ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <UserRound className="h-3 w-3" />
            )}
            Enter this point of view
          </button>
          <p className="px-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">
            Journey scenarios
          </p>
          <ul className="space-y-1">
            {scenarios.map((scenario) => (
              <ScenarioRow
                key={scenario.id}
                scenario={scenario}
                busy={busy}
                onRun={onRunScenario}
              />
            ))}
          </ul>
          <p className="truncate px-0.5 text-[9px] text-ink-faint">{mock.email}</p>
        </div>
      )}
    </div>
  )
}

function ScenarioRow({
  scenario,
  busy,
  onRun,
}: {
  scenario: AdminScenario
  busy: string | null
  onRun: (scenario: AdminScenario) => Promise<void>
}) {
  return (
    <li>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => onRun(scenario)}
        className="flex w-full items-start gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition hover:bg-accent-light/40 disabled:opacity-40"
      >
        {busy === scenario.id ? (
          <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-ink-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted" />
        )}
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold text-ink">{scenario.label}</span>
          <span className="block text-[9px] leading-snug text-ink-muted">
            {scenario.description}
          </span>
        </span>
      </button>
    </li>
  )
}
