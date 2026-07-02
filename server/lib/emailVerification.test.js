import { describe, expect, it } from 'vitest'
import {
  buildVerificationUrl,
  createVerificationToken,
  isEmailVerified,
  verificationTokenValid,
} from './emailVerification.js'

describe('emailVerification', () => {
  describe('createVerificationToken', () => {
    it('generates a 64-character hex token and future expiry', () => {
      const { token, expiresAt } = createVerificationToken()
      expect(token).toMatch(/^[0-9a-f]{64}$/)
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('generates unique tokens', () => {
      const a = createVerificationToken().token
      const b = createVerificationToken().token
      expect(a).not.toBe(b)
    })
  })

  describe('verificationTokenValid', () => {
    it('accepts a matching non-expired token', () => {
      const { token, expiresAt } = createVerificationToken()
      const user = { emailVerificationToken: token, emailVerificationExpiresAt: expiresAt }
      expect(verificationTokenValid(user, token)).toBe(true)
    })

    it('rejects a mismatched token', () => {
      const { expiresAt } = createVerificationToken()
      const user = { emailVerificationToken: 'abc', emailVerificationExpiresAt: expiresAt }
      expect(verificationTokenValid(user, 'xyz')).toBe(false)
    })

    it('rejects an expired token', () => {
      const user = {
        emailVerificationToken: 'abc',
        emailVerificationExpiresAt: new Date(Date.now() - 1000).toISOString(),
      }
      expect(verificationTokenValid(user, 'abc')).toBe(false)
    })
  })

  describe('isEmailVerified', () => {
    it('treats explicit true as verified', () => {
      expect(isEmailVerified({ emailVerified: true })).toBe(true)
    })

    it('treats explicit false as unverified', () => {
      expect(isEmailVerified({ emailVerified: false })).toBe(false)
    })

    it('treats legacy accounts without the field as verified', () => {
      expect(isEmailVerified({})).toBe(true)
    })
  })

  describe('buildVerificationUrl', () => {
    it('includes the token in the verify-email path', () => {
      const url = buildVerificationUrl('test-token-123')
      expect(url).toContain('/verify-email?token=test-token-123')
    })
  })
})
