import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLiveUpdateState, setLiveUpdateEnabled } from './liveUpdate.js'

describe('liveUpdate', () => {
  let tmpDir
  let previousFile

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leased-live-update-'))
    previousFile = process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE
    process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE = path.join(tmpDir, 'live-update.json')
  })

  afterEach(() => {
    if (previousFile === undefined) {
      delete process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE
    } else {
      process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE = previousFile
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('defaults to disabled when missing', () => {
    expect(getLiveUpdateState()).toEqual({ enabled: false })
  })

  it('persists enabled flag until explicitly turned off', () => {
    setLiveUpdateEnabled(null, true)
    expect(getLiveUpdateState()).toEqual({ enabled: true })
    expect(getLiveUpdateState()).toEqual({ enabled: true })
    setLiveUpdateEnabled(null, false)
    expect(getLiveUpdateState()).toEqual({ enabled: false })
  })
})
