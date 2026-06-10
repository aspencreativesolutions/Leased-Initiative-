import { Navigate } from 'react-router-dom'

/** Legacy URL — client sign-up lives at /register */
export function PortalRegisterPage() {
  return <Navigate to="/register" replace />
}
