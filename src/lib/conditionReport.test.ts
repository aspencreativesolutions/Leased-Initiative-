import { describe, expect, it } from 'vitest'
import { withLeasePreferenceClauses } from './leasePreferenceClauses'
import {
  buildConditionReportClause,
  getConditionReportPreferences,
  isConditionReportRequired,
  stripConditionReportClause,
  withConditionReportClause,
} from './conditionReport'

describe('conditionReport', () => {
  it('defaults required on with 7-day windows', () => {
    expect(getConditionReportPreferences(undefined)).toEqual({
      required: true,
      moveInDays: 7,
      moveOutDays: 7,
      clauseWording: undefined,
    })
  })

  it('resolves per-rental override over account default', () => {
    expect(
      isConditionReportRequired({ conditionReport: { required: true } }, null)
    ).toBe(true)
    expect(
      isConditionReportRequired(
        { conditionReport: { required: true } },
        { conditionReportRequired: false }
      )
    ).toBe(false)
    expect(
      isConditionReportRequired(
        { conditionReport: { required: false } },
        { conditionReportRequired: true }
      )
    ).toBe(true)
  })

  it('builds and strips the lease clause', () => {
    const clause = buildConditionReportClause({
      required: true,
      moveInDays: 5,
      moveOutDays: 3,
    })
    expect(clause).toContain('Condition Report.')
    expect(clause).toContain('5 days')
    expect(clause).toContain('3 days')
    const withClause = withConditionReportClause('Base terms.', {
      required: true,
      moveInDays: 7,
      moveOutDays: 7,
    })
    expect(stripConditionReportClause(withClause)).toBe('Base terms.')
  })
})

describe('withLeasePreferenceClauses', () => {
  it('includes condition report with key return and tenant photo', () => {
    const terms = withLeasePreferenceClauses('Renewal language.', {
      keyReturn: { autoNotify: true, gracePeriodDays: 7, fineAmount: 100 },
      tenantPhoto: { required: true },
      conditionReport: { required: true, moveInDays: 7, moveOutDays: 7 },
    })
    expect(terms).toContain('Renewal language.')
    expect(terms).toContain('Key Return.')
    expect(terms).toContain('Tenant Photo.')
    expect(terms).toContain('Condition Report.')
  })
})
