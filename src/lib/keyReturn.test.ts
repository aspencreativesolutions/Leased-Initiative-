import { describe, expect, it } from 'vitest'
import {
  buildDefaultKeyReturnClause,
  buildKeyReturnClause,
  buildKeyReturnNotificationMessage,
  DEFAULT_KEY_RETURN_PREFERENCES,
  getKeyReturnPreferences,
  stripKeyReturnClause,
  withKeyReturnClause,
} from './keyReturn'

describe('keyReturn', () => {
  it('defaults autoNotify on with 7-day grace and $100 fine', () => {
    expect(getKeyReturnPreferences(undefined)).toEqual(DEFAULT_KEY_RETURN_PREFERENCES)
    expect(getKeyReturnPreferences({}).autoNotify).toBe(true)
  })

  it('builds the default lease clause from preferences', () => {
    const clause = buildDefaultKeyReturnClause({
      gracePeriodDays: 5,
      fineAmount: 250,
    })
    expect(clause).toContain('Key Return.')
    expect(clause).toContain('within 5 days after lease end')
    expect(clause).toContain('$250')
  })

  it('uses custom clause wording when saved', () => {
    const clause = buildKeyReturnClause({
      autoNotify: true,
      gracePeriodDays: 7,
      fineAmount: 100,
      clauseWording: 'Tenant must return keys within 7 days after lease end',
    })
    expect(clause).toBe(
      'Key Return. Tenant must return keys within 7 days after lease end'
    )
  })

  it('builds the tenant notification message', () => {
    const message = buildKeyReturnNotificationMessage({
      autoNotify: true,
      gracePeriodDays: 1,
      fineAmount: 75,
    })
    expect(message).toContain('within 1 day')
    expect(message).toContain('$75')
    expect(message).toContain('avoid')
  })

  it('appends and replaces the clause on editable lease terms', () => {
    const first = withKeyReturnClause('Lease ends on the stated date.', {
      autoNotify: true,
      gracePeriodDays: 7,
      fineAmount: 100,
    })
    expect(first).toContain('Lease ends on the stated date.')
    expect(first).toContain('Key Return.')

    const updated = withKeyReturnClause(first, {
      autoNotify: true,
      gracePeriodDays: 3,
      fineAmount: 200,
    })
    expect(updated).toContain('within 3 days')
    expect(updated).toContain('$200')
    expect(updated.match(/Key Return\./g)).toHaveLength(1)
    expect(stripKeyReturnClause(updated)).toBe('Lease ends on the stated date.')
  })
})
