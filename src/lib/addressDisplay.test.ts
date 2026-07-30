import { describe, expect, it } from 'vitest'
import { parseAddressSoftBreaks } from './addressDisplay'

describe('parseAddressSoftBreaks', () => {
  it('returns empty for blank input', () => {
    expect(parseAddressSoftBreaks('')).toEqual([])
    expect(parseAddressSoftBreaks('   ')).toEqual([])
  })

  it('keeps a single-line address without commas as one text segment', () => {
    expect(parseAddressSoftBreaks('12 Oak St')).toEqual([
      { kind: 'text', value: '12 Oak St' },
    ])
  })

  it('splits after each comma so the UI can soft-wrap', () => {
    expect(
      parseAddressSoftBreaks('523 Juanita Street, Steubenville, OH 43952')
    ).toEqual([
      { kind: 'text', value: '523 Juanita Street' },
      { kind: 'comma', value: ', ' },
      { kind: 'text', value: 'Steubenville' },
      { kind: 'comma', value: ', ' },
      { kind: 'text', value: 'OH 43952' },
    ])
  })

  it('preserves suite / unit segments between commas', () => {
    expect(
      parseAddressSoftBreaks(
        '401 Market Street, Suite 200, Steubenville, OH 43952'
      )
    ).toEqual([
      { kind: 'text', value: '401 Market Street' },
      { kind: 'comma', value: ', ' },
      { kind: 'text', value: 'Suite 200' },
      { kind: 'comma', value: ', ' },
      { kind: 'text', value: 'Steubenville' },
      { kind: 'comma', value: ', ' },
      { kind: 'text', value: 'OH 43952' },
    ])
  })
})
