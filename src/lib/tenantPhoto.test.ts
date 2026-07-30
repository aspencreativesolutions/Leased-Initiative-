import { describe, expect, it } from 'vitest'
import { withLeasePreferenceClauses } from './leasePreferenceClauses'
import {
  buildTenantPhotoClause,
  DEFAULT_TENANT_PHOTO_CLAUSE,
  getTenantPhotoPreferences,
  stripTenantPhotoClause,
  withTenantPhotoClause,
} from './tenantPhoto'

describe('tenantPhoto', () => {
  it('defaults required on', () => {
    expect(getTenantPhotoPreferences(undefined).required).toBe(true)
    expect(getTenantPhotoPreferences({}).required).toBe(true)
  })

  it('builds the default clause when required', () => {
    expect(buildTenantPhotoClause({ required: true })).toBe(DEFAULT_TENANT_PHOTO_CLAUSE)
    expect(buildTenantPhotoClause({ required: false })).toBe('')
  })

  it('appends and strips the photo clause', () => {
    const withClause = withTenantPhotoClause('Base terms.', { required: true })
    expect(withClause).toContain('Base terms.')
    expect(withClause).toContain('Tenant Photo.')
    expect(stripTenantPhotoClause(withClause)).toBe('Base terms.')
    expect(withTenantPhotoClause(withClause, { required: false })).toBe('Base terms.')
  })
})

describe('withLeasePreferenceClauses', () => {
  it('applies key return and tenant photo clauses together', () => {
    const terms = withLeasePreferenceClauses('Renewal language.', {
      keyReturn: { autoNotify: true, gracePeriodDays: 7, fineAmount: 100 },
      tenantPhoto: { required: true },
    })
    expect(terms).toContain('Renewal language.')
    expect(terms).toContain('Key Return.')
    expect(terms).toContain('Tenant Photo.')
    expect(terms).toContain('Condition Report.')
  })

  it('omits photo clause when not required', () => {
    const terms = withLeasePreferenceClauses('Renewal language.', {
      keyReturn: { autoNotify: true, gracePeriodDays: 7, fineAmount: 100 },
      tenantPhoto: { required: false },
    })
    expect(terms).toContain('Key Return.')
    expect(terms).not.toContain('Tenant Photo.')
    expect(terms).toContain('Condition Report.')
  })
})
