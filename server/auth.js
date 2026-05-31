import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readStore } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, clientId: user.clientId ?? null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const payload = verifyToken(token)
    const store = readStore()
    const user = store.users.find((u) => u.id === payload.sub)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId ?? null,
    }
    next()
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
  const { passwordHash, ...safe } = user
  return safe
}
