import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import {
  ACCOUNT_CREATION_DISABLED_MESSAGE,
  isAccountCreationEnabled,
} from '../lib/accountCreation.js'
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
  DEFAULT_LEASE_LENGTH_MONTHS,
  isFutureLeaseStartDate,
  isLeaseLengthMonths,
  isPlainYmd,
  parseLeaseLengthMonths,
} from '../lib/leaseSchedule.js'
import { pushAdminNotification } from '../lib/notifications.js'
import { DEFAULT_PORTAL_THEME_ID, isThemeId } from '../lib/themeIds.js'
import { getSandboxStore } from '../lib/demoSandbox.js'
import { preparePublicDemoStore } from '../lib/demoAccess.js'
import { LEASED_DEMO_USERS, isLeasedDemoEmail } from '../lib/leasedDemoUsers.js'
import { SAMPLE_CLIENT_EMAILS } from '../lib/sampleClientDates.js'
import {
  buildAgencyForInvite,
  buildLandlordAgencies,
  findValidTenantInvite,
  findValidTenantInviteByCode,
  getTenantDiscoveryMode,
  markTenantInviteUsed,
  publicInvitePayload,
} from '../lib/tenantInvites.js'
import { availableApplicantSlotsAtAddress } from '../lib/rentalOccupancy.js'

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

  const address = user.preferredPropertyAddress?.trim()
  const company = user.preferredLandlordCompany?.trim()
  const details = [
    company ? `Landlord: ${company}` : null,
    address ? `Property: ${address}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  updateStore((s) =>
    pushAdminNotification(s, {
      type: 'registration',
      userId: user.id,
      title: 'New tenant registration',
      message: details
        ? `${user.name} (${user.email}) registered and is waiting for approval. ${details}`
        : `${user.name} (${user.email}) signed up as a tenant and is waiting for approval.`,
    })
  )
}

router.get('/landlord-companies', (_req, res) => {
  try {
    const store = readStore()
    const agencies = buildLandlordAgencies(store, { forPublicDiscovery: true })
    res.json({
      companies: agencies.map((agency) => agency.name),
      agencies,
    })
  } catch (err) {
    console.error('landlord-companies', err)
    res.status(500).json({ error: 'Could not load landlord companies' })
  }
})

router.get('/invite/:token', (req, res) => {
  try {
    const token = String(req.params.token ?? '')
    const store = readStore()
    const invite = findValidTenantInvite(store, token)
    if (!invite) {
      return res.status(404).json({ error: 'This invite link is invalid or has expired' })
    }
    res.json(publicInvitePayload(store, invite))
  } catch (err) {
    console.error('invite lookup', err)
    res.status(500).json({ error: 'Could not load invite' })
  }
})

/** Resolve a short connection code to the same payload as an invite token. */
router.get('/invite-code/:code', (req, res) => {
  try {
    const code = String(req.params.code ?? '')
    const store = readStore()
    const invite = findValidTenantInviteByCode(store, code)
    if (!invite) {
      return res.status(404).json({
        error: 'This connection code is invalid, already used, or has expired',
      })
    }
    res.json(publicInvitePayload(store, invite))
  } catch (err) {
    console.error('invite-code lookup', err)
    res.status(500).json({ error: 'Could not load connection code' })
  }
})

const PAYMENT_METHODS = new Set(['paypal', 'stripe', 'square'])

/**
 * Streamlined invite claim: no password / full signup.
 * Creates a verified tenant account from invite details + personal info,
 * then returns a session so they land on the portal waiting dashboard.
 */
router.post('/claim-invite', async (req, res) => {
  try {
    if (!isAccountCreationEnabled()) {
      return res.status(403).json({ error: ACCOUNT_CREATION_DISABLED_MESSAGE })
    }

    const {
      inviteToken,
      connectionCode,
      name,
      email,
      password,
      preferredPropertyAddress,
      preferredLeaseStartDate,
      preferredPaymentMethod,
      acceptedTermsOfService,
    } = req.body ?? {}

    if (acceptedTermsOfService !== true) {
      return res.status(400).json({
        error: 'You must sign the Terms of Service before creating an account',
      })
    }

    const trimmedName = String(name ?? '').trim()
    const normalizedEmail = String(email ?? '')
      .trim()
      .toLowerCase()
    const rawPassword = String(password ?? '')
    if (!trimmedName || !normalizedEmail) {
      return res.status(400).json({ error: 'Name and email are required' })
    }
    if (rawPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    if (!PAYMENT_METHODS.has(preferredPaymentMethod)) {
      return res.status(400).json({
        error: 'Choose a payment method (PayPal, Stripe, or Square)',
      })
    }

    const startDate = String(preferredLeaseStartDate ?? '')
      .trim()
      .slice(0, 10)
    if (!isPlainYmd(startDate) || !isFutureLeaseStartDate(startDate)) {
      return res.status(400).json({ error: 'Lease start date must be a future date' })
    }

    const store = readStore()
    let invite = null
    if (inviteToken) {
      invite = findValidTenantInvite(store, String(inviteToken))
      if (!invite) {
        return res.status(400).json({ error: 'This invite link is invalid or has expired' })
      }
    } else if (connectionCode) {
      invite = findValidTenantInviteByCode(store, String(connectionCode))
      if (!invite) {
        return res.status(400).json({
          error: 'This connection code is invalid, already used, or has expired',
        })
      }
    } else {
      return res.status(400).json({ error: 'Invite token or connection code is required' })
    }

    let propertyAddress = String(preferredPropertyAddress ?? '').trim()
    if (invite.propertyAddress) {
      propertyAddress = invite.propertyAddress.trim()
    }
    if (!propertyAddress) {
      return res.status(400).json({ error: 'Confirm the property for this invite' })
    }

    const agency = buildAgencyForInvite(store, invite)
    const allowedProperties = agency?.properties ?? []
    const invitePropertyOk =
      Boolean(invite.propertyAddress) &&
      invite.propertyAddress.trim().toLowerCase() === propertyAddress.toLowerCase()
    if (
      allowedProperties.length > 0 &&
      !allowedProperties.includes(propertyAddress) &&
      !invitePropertyOk
    ) {
      return res.status(400).json({ error: 'Select a property from the company’s list' })
    }

    const capacity = availableApplicantSlotsAtAddress(store, propertyAddress)
    if (!capacity.available) {
      return res.status(409).json({
        error:
          'That rental has no open occupancy right now. Ask your landlord for a new invite.',
      })
    }

    if (store.users.some((u) => u.email === normalizedEmail)) {
      return res.status(409).json({
        error:
          'An account with this email already exists. Sign in instead, or use a different email.',
      })
    }

    const leaseLengthMonths = parseLeaseLengthMonths(
      invite.leaseLengthMonths,
      DEFAULT_LEASE_LENGTH_MONTHS
    )
    const passwordHash = await hashPassword(rawPassword)
    const user = {
      id: generateId(),
      email: normalizedEmail,
      passwordHash,
      name: trimmedName,
      role: 'client',
      clientId: null,
      phone: invite.phone || '',
      preferredLeaseMonths: leaseLengthMonths,
      preferredLeaseStartDate: startDate,
      preferredLandlordCompany: invite.landlordCompany,
      preferredPropertyAddress: propertyAddress,
      preferredPaymentMethod,
      inviteToken: invite.token,
      inviteClaimed: true,
      portalThemeId: DEFAULT_PORTAL_THEME_ID,
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      termsAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    updateStore((s) => {
      let next = {
        ...s,
        users: [...s.users, user],
      }
      next = markTenantInviteUsed(next, invite.token, user.id)
      return next
    })

    notifyAdminOfNewClient(user)

    const token = signToken(user)
    res.status(201).json({
      token,
      user: sanitizeUser(user),
    })
  } catch (err) {
    console.error('claim-invite', err)
    res.status(500).json({ error: 'Could not submit invite details' })
  }
})

router.post('/register', async (req, res) => {
  try {
    if (!isAccountCreationEnabled()) {
      return res.status(403).json({ error: ACCOUNT_CREATION_DISABLED_MESSAGE })
    }

    const {
      email,
      password,
      name,
      portalThemeId,
      accountType,
      companyName,
      preferredLeaseMonths,
      preferredLandlordCompany,
      preferredPropertyAddress,
      inviteToken,
      connectionCode,
      acceptedTermsOfService,
    } = req.body
    if (acceptedTermsOfService !== true) {
      return res.status(400).json({
        error: 'You must sign the Terms of Service before creating an account',
      })
    }
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()
    const trimmedCompanyName = String(companyName ?? '').trim()
    const isAdmin = accountType === 'admin'
    if (isAdmin && !trimmedCompanyName) {
      return res.status(400).json({ error: 'Company name is required' })
    }
    if (
      !isAdmin &&
      preferredLeaseMonths != null &&
      preferredLeaseMonths !== '' &&
      !isLeaseLengthMonths(preferredLeaseMonths)
    ) {
      return res.status(400).json({
        error: 'Preferred lease length must be 6, 12, 18, or 24 months',
      })
    }

    const store = readStore()
    let invite = null
    if (!isAdmin) {
      if (inviteToken) {
        invite = findValidTenantInvite(store, String(inviteToken))
        if (!invite) {
          return res.status(400).json({ error: 'This invite link is invalid or has expired' })
        }
      } else if (connectionCode) {
        invite = findValidTenantInviteByCode(store, String(connectionCode))
        if (!invite) {
          return res.status(400).json({
            error: 'This connection code is invalid, already used, or has expired',
          })
        }
      }
    }

    let landlordCompany = String(preferredLandlordCompany ?? '').trim()
    let propertyAddress = String(preferredPropertyAddress ?? '').trim()
    if (invite) {
      // Invite always pre-links the tenant to the inviting company.
      landlordCompany = invite.landlordCompany
      if (invite.propertyAddress && !propertyAddress) {
        propertyAddress = invite.propertyAddress
      }
    }

    if (!isAdmin && !landlordCompany) {
      return res.status(400).json({
        error: 'Select the agency or landlord company you are renting from',
      })
    }
    if (!isAdmin && !propertyAddress) {
      return res.status(400).json({
        error: 'Select the property you are interested in',
      })
    }

    if (!isAdmin) {
      const discoveryMode = getTenantDiscoveryMode(store)
      if (discoveryMode === 'invite_only' && !invite) {
        return res.status(403).json({
          error:
            'This landlord is invite-only. Use a connection link or connection code to register.',
        })
      }

      const agencies = invite
        ? [buildAgencyForInvite(store, invite)].filter(Boolean)
        : buildLandlordAgencies(store, { forPublicDiscovery: true })
      const matchedAgency = agencies.find(
        (agency) => agency.name.toLowerCase() === landlordCompany.toLowerCase()
      )
      if (!invite && !matchedAgency) {
        return res.status(400).json({
          error: 'Select an agency from the list',
        })
      }
      const allowedProperties = matchedAgency?.properties ?? []
      const invitePropertyOk =
        Boolean(invite?.propertyAddress) &&
        invite.propertyAddress.trim().toLowerCase() === propertyAddress.toLowerCase()
      if (
        allowedProperties.length > 0 &&
        !allowedProperties.includes(propertyAddress) &&
        !invitePropertyOk
      ) {
        return res.status(400).json({
          error: 'Select a property from the company’s list',
        })
      }
      // Normalize company name to the canonical agency spelling when available.
      if (matchedAgency) {
        landlordCompany = matchedAgency.name
      }

      // Invite-only (and invite-path) registrations require open occupancy.
      if (invite || discoveryMode === 'invite_only') {
        const capacity = availableApplicantSlotsAtAddress(store, propertyAddress)
        if (!capacity.available) {
          return res.status(409).json({
            error:
              'That rental has no open occupancy right now. Choose another available property or ask your landlord for a new invite.',
          })
        }
      }
    }

    if (store.users.some((u) => u.email === normalizedEmail)) {
      return res.status(409).json({
        error:
          'An account with this email already exists. Sign in with the password you chose when you registered.',
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
      ...(!isAdmin
        ? {
            preferredLeaseMonths: parseLeaseLengthMonths(
              preferredLeaseMonths,
              DEFAULT_LEASE_LENGTH_MONTHS
            ),
            preferredLandlordCompany: landlordCompany,
            preferredPropertyAddress: propertyAddress,
            ...(invite ? { inviteToken: invite.token } : {}),
          }
        : {}),
      portalThemeId: isAdmin
        ? undefined
        : isThemeId(portalThemeId)
          ? portalThemeId
          : DEFAULT_PORTAL_THEME_ID,
      emailVerified: false,
      termsAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    updateStore((s) => {
      let next = {
        ...s,
        users: [...s.users, user],
        clients:
          linkedClient && !isAdmin
            ? s.clients.map((c) =>
                c.id === linkedClient.id ? { ...c, accountUserId: user.id } : c
              )
            : s.clients,
        ...(isAdmin
          ? {
              settings: {
                ...s.settings,
                businessName: trimmedCompanyName,
              },
            }
          : {}),
      }
      if (invite) {
        next = markTenantInviteUsed(next, invite.token, user.id)
      }
      return next
    })

    await issueVerificationEmail(user)

    res.status(201).json({
      ok: true,
      email: normalizedEmail,
      requiresVerification: true,
      message: 'Check your email for a confirmation link to activate your account.',
    })
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

function isPublicDemoEligibleUser(user, normalizedEmail) {
  if (!user) return false
  if (user.isLeasedDemoUser === true || user.isSamplePortalUser === true) return true
  if (isLeasedDemoEmail(normalizedEmail)) return true
  if (SAMPLE_CLIENT_EMAILS.has(normalizedEmail)) return true
  return LEASED_DEMO_USERS.some((d) => d.email === normalizedEmail)
}

function findUserInStore(store, normalizedEmail) {
  return store?.users?.find((u) => u.email === normalizedEmail) ?? null
}

router.post('/login', async (req, res) => {
  try {
    const { email, password, publicDemo } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const wantPublicDemo = publicDemo === true

    let store = wantPublicDemo ? getSandboxStore() || readStore() : readStore()
    let user = findUserInStore(store, normalizedEmail)

    // Public demo on serverless hosts can land on a fresh instance with an empty
    // in-memory sandbox — reseed before failing the POV picker.
    if (wantPublicDemo && !user) {
      await preparePublicDemoStore()
      store = getSandboxStore() || readStore()
      user = findUserInStore(store, normalizedEmail)
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!isEmailVerified(user)) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
    }

    const isDemo = isPublicDemoEligibleUser(user, normalizedEmail)

    if (wantPublicDemo && !isDemo) {
      return res.status(403).json({
        error: 'Public demo sign-in is only available for demo accounts.',
      })
    }

    const token = signToken(user, { publicDemo: wantPublicDemo && isDemo })
    const safeUser = sanitizeUser(user)
    res.json({
      token,
      user: {
        ...safeUser,
        publicDemo: wantPublicDemo && isDemo,
        isLeasedDemoUser: isDemo,
      },
    })
  } catch (err) {
    console.error('login', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', authMiddleware, (req, res) => {
  const store = readStore()
  const user = store.users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({
    user: {
      ...sanitizeUser(user),
      publicDemo: req.user.publicDemo === true,
      isLeasedDemoUser: req.user.isLeasedDemoUser === true,
    },
  })
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
