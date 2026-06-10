import { Navigate } from 'react-router-dom'

/** Legacy URL — client sign-in lives at /login */
export function PortalLoginPage() {
  return <Navigate to="/login" replace />
}
