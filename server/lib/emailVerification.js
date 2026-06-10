import crypto from 'crypto'

const TOKEN_BYTES = 32
const EXPIRY_HOURS = 24

/** Legacy accounts without the field are treated as verified */
export function isEmailVerified(user) {
  if (user?.emailVerified === true) return true
  if (user?.emailVerified === false) return false
  return true
}

export function createVerificationToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex')
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  return { token, expiresAt }
}

export function verificationTokenValid(user, token) {
  if (!user?.emailVerificationToken || !token) return false
  if (user.emailVerificationToken !== token) return false
  if (
    user.emailVerificationExpiresAt &&
    new Date(user.emailVerificationExpiresAt) < new Date()
  ) {
    return false
  }
  return true
}

export function buildVerificationUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`
}
