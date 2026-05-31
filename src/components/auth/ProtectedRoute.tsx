import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

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
    const loginPath = role === 'client' ? '/portal/login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/' : '/portal'} replace />
  }

  return <Outlet />
}
