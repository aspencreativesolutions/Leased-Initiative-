import { describe, expect, it } from 'vitest'
import { getLiveUpdateState, setLiveUpdateEnabled } from './liveUpdate.js'

describe('liveUpdate', () => {
  it('defaults to disabled when missing', () => {
    expect(getLiveUpdateState({})).toEqual({ enabled: false })
    expect(getLiveUpdateState({ liveUpdate: { enabled: true } })).toEqual({ enabled: true })
  })

  it('persists enabled flag and timestamp', () => {
    const next = setLiveUpdateEnabled({ users: [] }, true)
    expect(next.liveUpdate.enabled).toBe(true)
    expect(typeof next.liveUpdate.updatedAt).toBe('string')
    expect(setLiveUpdateEnabled(next, false).liveUpdate.enabled).toBe(false)
  })
})
