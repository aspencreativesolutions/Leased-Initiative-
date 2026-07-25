import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { shouldRecoverPublicDemoAtHome } from '@/lib/publicDemo'

interface ProtectedRouteProps {
  role?: 'admin' | 'client'
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
        Loading…
      </div>
    )
  }

  if (!user) {
    // Demo sessions recover via homepage Quick Access (key → demo code), not role login.
    // HomePage clears the demo session when it handles openDemoCode.
    if (shouldRecoverPublicDemoAtHome()) {
      return <Navigate to="/" replace state={{ openDemoCode: true }} />
    }
    const loginPath = role === 'admin' ? '/studio/login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/studio' : '/portal'} replace />
  }

  if (user.emailVerified === false) {
    const params = new URLSearchParams({ email: user.email })
    if (user.role === 'admin') params.set('studio', '1')
    return <Navigate to={`/check-email?${params.toString()}`} replace />
  }

  return <Outlet />
}
