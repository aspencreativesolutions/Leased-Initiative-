import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import {
  authMiddleware,
  hashPassword,
  sanitizeUser,
  signToken,
  verifyPassword,
} from '../auth.js'
import {
  expectedWorkEmail,
  isWorkAdminEmail,
  isWorkEmailDomain,
} from '../lib/workEmail.js'

const router = Router()

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const store = readStore()
    if (store.users.some((u) => u.email === normalizedEmail)) {
      return res.status(409).json({
        error:
          'An account with this email already exists. Sign in with the password you chose when you registered.',
      })
    }

    const isAdmin = isWorkAdminEmail(normalizedEmail, trimmedName)
    if (isWorkEmailDomain(normalizedEmail) && !isAdmin) {
      const example = expectedWorkEmail(trimmedName)
      return res.status(400).json({
        error: example
          ? `Work email must match your first name (e.g. ${example})`
          : 'Work email must match your first name at aspencreativesolutions.com',
      })
    }

    const linkedClient =
      !isAdmin &&
      store.clients.find((c) => c.email.trim().toLowerCase() === normalizedEmail)

    const passwordHash = await hashPassword(password)
    const user = {
      id: generateId(),
      email: normalizedEmail,
      passwordHash,
      name: trimmedName,
      role: isAdmin ? 'admin' : 'client',
      clientId: linkedClient?.id ?? null,
      createdAt: new Date().toISOString(),
    }

    updateStore((s) => ({
      ...s,
      users: [...s.users, user],
      clients:
        linkedClient && !isAdmin
          ? s.clients.map((c) =>
              c.id === linkedClient.id ? { ...c, accountUserId: user.id } : c
            )
          : s.clients,
    }))

    const token = signToken(user)
    res.status(201).json({ token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('register', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const store = readStore()
    const user = store.users.find((u) => u.email === normalizedEmail)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('login', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', authMiddleware, (req, res) => {
  const store = readStore()
  const user = store.users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user: sanitizeUser(user) })
})

export default router
