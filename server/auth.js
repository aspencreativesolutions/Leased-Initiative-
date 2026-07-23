import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readStore, readStoreFromDisk } from './db.js'
import { isEmailVerified } from './lib/emailVerification.js'
import {
  ensureSandboxFrom,
  getSandboxStore,
  runInDemoSandbox,
} from './lib/demoSandbox.js'
import { LEASED_DEMO_USERS } from './lib/leasedDemoUsers.js'
import { DEFAULT_PORTAL_THEME_ID, isThemeId } from './lib/themeIds.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(user, options = {}) {
  const payload = {
    sub: user.id,
    role: user.role,
    clientId: user.clientId ?? null,
  }
  if (options.publicDemo === true) {
    payload.publicDemo = true
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.publicDemo === true ? '12h' : JWT_EXPIRES,
  })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

function isLeasedDemoUserRecord(user) {
  if (!user) return false
  if (user.isLeasedDemoUser === true) return true
  const email = user.email?.trim().toLowerCase()
  return Boolean(email && LEASED_DEMO_USERS.some((d) => d.email === email))
}

function resolveAuthUser(payload) {
  if (payload.publicDemo === true) {
    if (!getSandboxStore()) {
      ensureSandboxFrom(readStoreFromDisk())
    }
  }
  const store = payload.publicDemo === true ? getSandboxStore() || readStore() : readStore()
  return store.users.find((u) => u.id === payload.sub)
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const payload = verifyToken(token)
    const continueWithUser = () => {
      const user = resolveAuthUser(payload)
      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }
      if (!isEmailVerified(user)) {
        return res.status(403).json({
          error: 'Please verify your email before continuing.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        })
      }
      const publicDemo =
        payload.publicDemo === true && isLeasedDemoUserRecord(user)
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId ?? null,
        publicDemo,
        isLeasedDemoUser: isLeasedDemoUserRecord(user),
      }
      next()
    }

    if (payload.publicDemo === true) {
      if (!getSandboxStore()) {
        ensureSandboxFrom(readStoreFromDisk())
      }
      return runInDemoSandbox(continueWithUser)
    }

    continueWithUser()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    next()
  }
}

export function sanitizeUser(user) {
  const {
    passwordHash,
    emailVerificationToken,
    emailVerificationExpiresAt,
    ...safe
  } = user
  const portalThemeId =
    safe.portalThemeId == null
      ? safe.portalThemeId
      : isThemeId(safe.portalThemeId)
        ? safe.portalThemeId
        : DEFAULT_PORTAL_THEME_ID
  return {
    ...safe,
    portalThemeId,
    emailVerified: isEmailVerified(user),
  }
}
