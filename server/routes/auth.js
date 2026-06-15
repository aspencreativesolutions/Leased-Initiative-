import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import {
  authMiddleware,
  hashPassword,
  sanitizeUser,
  signToken,
  verifyPassword,
} from '../auth.js'
import { sendVerificationEmail } from '../lib/email.js'
import {
  buildVerificationUrl,
  createVerificationToken,
  isEmailVerified,
  verificationTokenValid,
} from '../lib/emailVerification.js'
import {
  expectedWorkEmail,
  isWorkAdminEmail,
  isWorkEmailDomain,
} from '../lib/workEmail.js'
import { pushAdminNotification } from '../lib/notifications.js'
import { DEFAULT_PORTAL_THEME_ID, isThemeId } from '../lib/themeIds.js'

const router = Router()

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function issueVerificationEmail(user) {
  const { token, expiresAt } = createVerificationToken()
  const verifyUrl = buildVerificationUrl(token)

  updateStore((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            emailVerificationToken: token,
            emailVerificationExpiresAt: expiresAt,
          }
        : u
    ),
  }))

  const result = await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl,
  })

  return { verifyUrl, ...result }
}

function notifyAdminOfNewClient(user) {
  if (user.role !== 'client' || user.clientId) return

  updateStore((s) =>
    pushAdminNotification(s, {
      type: 'registration',
      userId: user.id,
      title: 'New portal registration',
      message: `${user.name} (${user.email}) signed up for the client portal.`,
    })
  )
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, portalThemeId, accountType } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const registeringAsAdmin = accountType === 'admin'
    const store = readStore()
    if (store.users.some((u) => u.email === normalizedEmail)) {
      return res.status(409).json({
        error:
          'An account with this email already exists. Sign in with the password you chose when you registered.',
      })
    }

    const isAdmin =
      registeringAsAdmin && isWorkAdminEmail(normalizedEmail, trimmedName)
    if (registeringAsAdmin) {
      if (isWorkEmailDomain(normalizedEmail) && !isAdmin) {
        const example = expectedWorkEmail(trimmedName)
        return res.status(400).json({
          error: example
            ? `Work email must match your first name (e.g. ${example})`
            : 'Work email must match your first name at aspencreativesolutions.com',
        })
      }
      if (!isAdmin) {
        return res.status(400).json({
          error:
            'Studio accounts require an Aspen Creative Solutions work email (firstname@aspencreativesolutions.com).',
        })
      }
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
      portalThemeId: isAdmin
        ? undefined
        : isThemeId(portalThemeId)
          ? portalThemeId
          : DEFAULT_PORTAL_THEME_ID,
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
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

    notifyAdminOfNewClient(user)

    const token = signToken(user)
    res.status(201).json({ token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('register', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body ?? {}
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    const store = readStore()
    const user = store.users.find((u) => u.emailVerificationToken === token)
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' })
    }
    if (!verificationTokenValid(user, token)) {
      return res.status(400).json({ error: 'This verification link has expired' })
    }
    if (isEmailVerified(user)) {
      const authToken = signToken(user)
      return res.json({
        token: authToken,
        user: sanitizeUser(user),
        alreadyVerified: true,
      })
    }

    let verifiedUser = null
    updateStore((s) => {
      const idx = s.users.findIndex((u) => u.id === user.id)
      if (idx < 0) return s
      verifiedUser = {
        ...s.users[idx],
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        emailVerificationToken: undefined,
        emailVerificationExpiresAt: undefined,
      }
      const users = [...s.users]
      users[idx] = verifiedUser
      return { ...s, users }
    })

    if (!verifiedUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    notifyAdminOfNewClient(verifiedUser)

    const authToken = signToken(verifiedUser)
    res.json({ token: authToken, user: sanitizeUser(verifiedUser) })
  } catch (err) {
    console.error('verify-email', err)
    res.status(500).json({ error: 'Could not verify email' })
  }
})

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body ?? {}
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const store = readStore()
    const user = store.users.find((u) => u.email === normalizedEmail)
    if (!user) {
      return res.json({
        ok: true,
        message: 'If an unverified account exists for that email, a new link has been sent.',
      })
    }
    if (isEmailVerified(user)) {
      return res.status(400).json({ error: 'This email is already verified. You can sign in.' })
    }

    const emailResult = await issueVerificationEmail(user)

    res.json({
      ok: true,
      message: 'A new verification email has been sent.',
    })
  } catch (err) {
    console.error('resend-verification', err)
    res.status(500).json({ error: 'Could not resend verification email' })
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

router.patch('/me', authMiddleware, (req, res) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const trimmedName = name.trim()
    let updatedUser = null

    updateStore((s) => {
      const idx = s.users.findIndex((u) => u.id === req.user.id)
      if (idx < 0) return s
      updatedUser = { ...s.users[idx], name: trimmedName }
      const users = [...s.users]
      users[idx] = updatedUser
      return { ...s, users }
    })

    if (!updatedUser) return res.status(404).json({ error: 'User not found' })
    res.json({ user: sanitizeUser(updatedUser) })
  } catch (err) {
    console.error('update profile', err)
    res.status(500).json({ error: 'Could not update profile' })
  }
})

router.patch('/portal-theme', authMiddleware, async (req, res) => {
  try {
    const { themeId } = req.body ?? {}
    if (!isThemeId(themeId)) {
      return res.status(400).json({ error: 'A valid theme is required' })
    }

    const store = readStore()
    const user = store.users.find((u) => u.id === req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'Portal theme is only for client accounts' })
    }

    let updatedUser = null
    updateStore((s) => {
      const idx = s.users.findIndex((u) => u.id === req.user.id)
      if (idx < 0) return s
      updatedUser = { ...s.users[idx], portalThemeId: themeId }
      const users = [...s.users]
      users[idx] = updatedUser
      return { ...s, users }
    })

    if (!updatedUser) return res.status(404).json({ error: 'User not found' })
    res.json({ user: sanitizeUser(updatedUser) })
  } catch (err) {
    console.error('portal theme', err)
    res.status(500).json({ error: 'Could not save portal theme' })
  }
})

router.patch('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    const store = readStore()
    const user = store.users.find((u) => u.id === req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const passwordHash = await hashPassword(newPassword)
    updateStore((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === req.user.id ? { ...u, passwordHash } : u
      ),
    }))

    res.json({ ok: true })
  } catch (err) {
    console.error('change password', err)
    res.status(500).json({ error: 'Could not change password' })
  }
})

export default router
