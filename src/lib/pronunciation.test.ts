import { describe, expect, it } from 'vitest'
import {
  buildPronunciationIndex,
  createPronunciationLookup,
  PRONUNCIATION_SCHEMA,
  type PronunciationPayload,
  validatePronunciationPayload,
} from './pronunciation'

type RawMandarinReading = {
  id: string
  pinyinDisplay: string
  pinyinAscii: string
  zhuyinDisplay: string
  zhuyinKeySequence: string
  source: string
  rank: number
  examples?: unknown
}

type RawPayload = {
  schema: string
  dictVersion: string
  artifact: {
    file: string
    sha256: string
    bytes: number
  }
  entries: Record<string, { mandarinReadings: RawMandarinReading[] }>
}

function createPayload(): RawPayload {
  return {
    schema: PRONUNCIATION_SCHEMA,
    dictVersion: '2026.03.0',
    artifact: {
      file: 'pronunciation.2026.03.0.test.v1.json',
      sha256: 'ABCDEF1234',
      bytes: 123,
    },
    entries: {
      中: {
        mandarinReadings: [
          {
            id: 'middle',
            pinyinDisplay: 'zhòng',
            pinyinAscii: 'zhong4',
            zhuyinDisplay: 'ㄓㄨㄥˋ',
            zhuyinKeySequence: 'vm4',
            source: 'unihan',
            rank: 1,
          },
          {
            id: 'center',
            pinyinDisplay: 'zhōng',
            pinyinAscii: 'zhong1',
            zhuyinDisplay: 'ㄓㄨㄥ',
            zhuyinKeySequence: 'vm',
            source: 'unihan',
            rank: 0,
          },
        ],
      },
    },
  }
}

describe('pronunciation.ts', () => {
  it('validates payloads and sorts readings by rank', () => {
    const payload = validatePronunciationPayload(createPayload())
    const index = buildPronunciationIndex(payload)
    const lookup = createPronunciationLookup(index)

    expect(payload.artifact.sha256).toBe('abcdef1234')
    expect(lookup('中')).toEqual([
      expect.objectContaining({ id: 'center', rank: 0, pinyinDisplay: 'zhōng' }),
      expect.objectContaining({ id: 'middle', rank: 1, pinyinDisplay: 'zhòng' }),
    ])
    expect(lookup('木')).toBeUndefined()
  })

  it('normalizes display strings to NFC', () => {
    const payload = createPayload()
    payload.entries.中.mandarinReadings[0] = {
      ...payload.entries.中.mandarinReadings[0],
      pinyinDisplay: 'lǖ',
    }

    const normalized = validatePronunciationPayload(payload)
    const readings = normalized.entries['中']?.mandarinReadings
    expect(readings?.[1]?.pinyinDisplay).toBe('lǖ')
  })

  it('throws on invalid schema', () => {
    const payload = createPayload()
    payload.schema = 'wrong-schema'

    expect(() => validatePronunciationPayload(payload)).toThrow(
      `Pronunciation payload schema must be ${PRONUNCIATION_SCHEMA}`,
    )
  })

  it('throws on empty payload entries', () => {
    const payload = createPayload()
    payload.entries = {}

    expect(() => validatePronunciationPayload(payload)).toThrow(
      'Pronunciation payload must contain at least one entry',
    )
  })

  it('throws when duplicate normalized readings remain', () => {
    const payload = createPayload()
    payload.entries.中.mandarinReadings.push({
      id: 'duplicate',
      pinyinDisplay: 'ZHONG',
      pinyinAscii: 'ZHONG1',
      zhuyinDisplay: 'ㄓㄨㄥ',
      zhuyinKeySequence: 'VM',
      source: 'unihan',
      rank: 9,
    })

    expect(() => validatePronunciationPayload(payload)).toThrow(
      'entries.中.mandarinReadings contains duplicate normalized readings',
    )
  })

  it('throws when entry key is not a single character', () => {
    const payload = createPayload()
    payload.entries = {
      中文: payload.entries.中,
    }

    expect(() => validatePronunciationPayload(payload)).toThrow(
      'entries key must be exactly one Unicode character: 中文',
    )
  })

  it('validates optional examples without requiring display fields', () => {
    const payload = createPayload()
    payload.entries.中.mandarinReadings[0] = {
      ...payload.entries.中.mandarinReadings[0],
      examples: [{ term: '中肯', source: 'demo' }],
    }

    const normalized = validatePronunciationPayload(payload)
    expect(normalized.entries['中']?.mandarinReadings[1]?.examples).toEqual([
      { term: '中肯', source: 'demo', pinyinDisplay: undefined, zhuyinDisplay: undefined },
    ])
  })

  it('throws when payload is not an object', () => {
    expect(() => validatePronunciationPayload(null)).toThrow('Pronunciation payload must be an object')
  })

  it('throws when entries is not an object map', () => {
    const payload = createPayload()
    ;(payload as { entries: unknown }).entries = []

    expect(() => validatePronunciationPayload(payload)).toThrow('entries must be an object map')
  })

  it('throws when examples is not an array', () => {
    const payload = createPayload()
    payload.entries.中.mandarinReadings[0] = {
      ...payload.entries.中.mandarinReadings[0],
      examples: 'bad-example-shape',
    }

    expect(() => validatePronunciationPayload(payload)).toThrow(
      'entries.中.mandarinReadings[0].examples must be an array when provided',
    )
  })

  it('throws when an example item is not an object', () => {
    const payload = createPayload()
    payload.entries.中.mandarinReadings[0] = {
      ...payload.entries.中.mandarinReadings[0],
      examples: ['bad-example-item'],
    }

    expect(() => validatePronunciationPayload(payload)).toThrow(
      'entries.中.mandarinReadings[0].examples[0] must be an object',
    )
  })

  it('throws when buildPronunciationIndex receives an empty validated shape', () => {
    const payload: PronunciationPayload = {
      schema: PRONUNCIATION_SCHEMA,
      dictVersion: '2026.03.0',
      artifact: {
        file: 'pronunciation.empty.v1.json',
        sha256: 'abc123',
        bytes: 0,
      },
      entries: {},
    }

    expect(() => buildPronunciationIndex(payload)).toThrow(
      'Pronunciation payload must contain at least one indexed entry',
    )
  })
})
