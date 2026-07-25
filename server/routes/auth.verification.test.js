import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { readStore } from '../db.js'
import {
  cleanupTestStore,
  createAuthTestApp,
  useTestStore,
} from '../test/helpers.js'

describe('auth email verification flow', () => {
  let app

  beforeEach(async () => {
    useTestStore()
    app = await createAuthTestApp()
  })

  afterEach(() => {
    cleanupTestStore()
  })

  async function registerUser(email = 'client@example.com') {
    return request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Client',
        email,
        password: 'password123',
        accountType: 'client',
        preferredLandlordCompany: 'Your Studio',
        preferredPropertyAddress: '211 East Main Street, St. Clairsville, OH 43950',
        preferredLeaseMonths: 12,
        acceptedTermsOfService: true,
      })
  }

  it('creates an unverified user and requires email confirmation', async () => {
    const res = await registerUser()
    expect(res.status).toBe(201)
    expect(res.body.requiresVerification).toBe(true)
    expect(res.body.email).toBe('client@example.com')
    expect(res.body.token).toBeUndefined()

    const store = readStore()
    const user = store.users.find((u) => u.email === 'client@example.com')
    expect(user.emailVerified).toBe(false)
    expect(user.emailVerificationToken).toBeTruthy()
  })

  it('blocks login until email is verified', async () => {
    await registerUser()

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@example.com', password: 'password123' })

    expect(loginRes.status).toBe(403)
    expect(loginRes.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(loginRes.body.email).toBe('client@example.com')
  })

  it('verifies email with a valid token and allows login', async () => {
    await registerUser()
    const store = readStore()
    const user = store.users.find((u) => u.email === 'client@example.com')
    const token = user.emailVerificationToken

    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token })

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.token).toBeTruthy()
    expect(verifyRes.body.user.emailVerified).toBe(true)

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@example.com', password: 'password123' })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.emailVerified).toBe(true)
  })

  it('rejects invalid verification tokens', async () => {
    await registerUser()

    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'not-a-real-token' })

    expect(verifyRes.status).toBe(400)
    expect(verifyRes.body.error).toMatch(/invalid|expired/i)
  })

  it('rejects expired verification tokens', async () => {
    await registerUser()
    const store = readStore()
    const user = store.users.find((u) => u.email === 'client@example.com')
    const token = user.emailVerificationToken

    const { updateStore } = await import('../db.js')
    updateStore((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              emailVerificationExpiresAt: new Date(Date.now() - 1000).toISOString(),
            }
          : u
      ),
    }))

    const expiredRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token })

    expect(expiredRes.status).toBe(400)
    expect(expiredRes.body.error).toMatch(/expired/i)
  })

  it('resends verification email for unverified accounts', async () => {
    await registerUser()
    const before = readStore().users.find((u) => u.email === 'client@example.com')
    const oldToken = before.emailVerificationToken

    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'client@example.com' })

    expect(resendRes.status).toBe(200)
    expect(resendRes.body.ok).toBe(true)

    const after = readStore().users.find((u) => u.email === 'client@example.com')
    expect(after.emailVerificationToken).toBeTruthy()
    expect(after.emailVerificationToken).not.toBe(oldToken)
  })
})
