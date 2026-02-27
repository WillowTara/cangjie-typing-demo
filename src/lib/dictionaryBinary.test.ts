import { describe, expect, it } from 'vitest'
import { createBinaryLookup, decodeDictionaryBinary, encodeDictionaryBinary } from './dictionaryBinary'
import type { DictionaryEntry } from './dictionary'
import { buildDictionaryIndex, parseDictionaryCsv } from './dictionary'

const SAMPLE_ENTRIES: DictionaryEntry[] = [
  { char: '日', cangjie: 'A', quick: 'A' },
  { char: '月', cangjie: 'B', quick: 'B' },
  { char: '你', cangjie: 'ONF', quick: 'OF' },
]

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer)
  view.setUint32(offset, value >>> 0, true)
}

function writeU16(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer)
  view.setUint16(offset, value, true)
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff

  for (let offset = 0; offset < bytes.length; offset += 1) {
    crc ^= bytes[offset] ?? 0
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function refreshPayloadCrc(bytes: Uint8Array): void {
  const payloadBytes = new DataView(bytes.buffer).getUint32(40, true)
  const payload = bytes.subarray(64, 64 + payloadBytes)
  writeU32(bytes, 44, crc32(payload))
}

describe('dictionaryBinary.ts', () => {
  it('throws when encoding empty dictionary', () => {
    expect(() => encodeDictionaryBinary([])).toThrow('Cannot encode empty dictionary')
  })

  it('throws when entry code is invalid', () => {
    const invalidEntries: DictionaryEntry[] = [{ char: '日', cangjie: '123', quick: 'A' }]
    expect(() => encodeDictionaryBinary(invalidEntries)).toThrow('cangjie must be A-Z and length 1..5')
  })

  it('encodes and decodes a valid v2 binary payload', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    const decoded = decodeDictionaryBinary(binary)

    expect(decoded.header.versionMajor).toBe(2)
    expect(decoded.header.headerSize).toBe(64)
    expect(decoded.header.entryCount).toBe(3)
    expect(decoded.codepoints.length).toBe(3)
    expect(decoded.cangjieTable.length).toBe(18)
  })

  it('supports binary lookup with derived quick when quick table omitted', () => {
    const entries: DictionaryEntry[] = [{ char: '我', cangjie: 'HQI', quick: 'HI' }]
    const binary = encodeDictionaryBinary(entries, { includeQuickTable: false })
    const decoded = decodeDictionaryBinary(binary)
    const lookup = createBinaryLookup(decoded)

    const hit = lookup('我')
    expect(hit).toEqual({ cangjie: 'HQI', quick: 'HI' })
    expect(lookup('木')).toBeUndefined()
  })

  it('supports binary lookup with explicit quick table', () => {
    const entries: DictionaryEntry[] = [{ char: '你', cangjie: 'ONF', quick: 'OF' }]
    const binary = encodeDictionaryBinary(entries, { includeQuickTable: true })
    const decoded = decodeDictionaryBinary(binary)
    const lookup = createBinaryLookup(decoded)

    expect(lookup('你')).toEqual({ cangjie: 'ONF', quick: 'OF' })
  })

  it('keeps migration parity between v1 index and v2 binary lookup', () => {
    const csv = `char,cangjie,quick
日,A,A
明,AB,
你,ONF,OF
𠮷,ONF,
〇,A,
日,B,B`

    const entries = parseDictionaryCsv(csv)
    const v1Index = buildDictionaryIndex(entries)

    const binary = encodeDictionaryBinary(entries)
    const decoded = decodeDictionaryBinary(binary)
    const v2Lookup = createBinaryLookup(decoded)

    expect(decoded.header.entryCount).toBe(v1Index.size)

    for (const [char, expected] of v1Index.map.entries()) {
      expect(v2Lookup(char)).toEqual(expected)
    }

    expect(v2Lookup('木')).toBeUndefined()
  })

  it('throws for invalid lookup input', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    const decoded = decodeDictionaryBinary(binary)
    const lookup = createBinaryLookup(decoded)

    expect(() => lookup('你好')).toThrow('Lookup input must be exactly one Unicode character')
  })

  it('stores frequency when provided', () => {
    const frequencyByChar = new Map<string, number>([
      ['日', 1],
      ['月', 2],
      ['你', 3],
    ])

    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES, { frequencyByChar })
    const decoded = decodeDictionaryBinary(binary)

    expect(decoded.frequency).toBeDefined()
    expect(Array.from(decoded.frequency ?? [])).toEqual([3, 1, 2])
  })

  it('throws on invalid magic', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    binary[0] = 0

    expect(() => decodeDictionaryBinary(binary)).toThrow('Invalid binary dictionary magic')
  })

  it('throws on crc mismatch', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    binary[binary.length - 1] = binary[binary.length - 1] === 0 ? 1 : 0

    expect(() => decodeDictionaryBinary(binary)).toThrow('Binary dictionary CRC mismatch')
  })

  it('throws on unsupported version', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    writeU16(binary, 8, 1)

    expect(() => decodeDictionaryBinary(binary)).toThrow('Unsupported binary dictionary version')
  })

  it('throws on invalid offsets', () => {
    const withQuick = encodeDictionaryBinary(SAMPLE_ENTRIES, { includeQuickTable: true })
    writeU32(withQuick, 32, 0)
    expect(() => decodeDictionaryBinary(withQuick)).toThrow('Invalid quick offset')

    const withFrequency = encodeDictionaryBinary(SAMPLE_ENTRIES, {
      frequencyByChar: new Map<string, number>([
        ['日', 1],
        ['月', 2],
        ['你', 3],
      ]),
    })
    writeU32(withFrequency, 36, 0)
    expect(() => decodeDictionaryBinary(withFrequency)).toThrow('Invalid frequency offset')
  })

  it('throws when codepoints are not strictly increasing', () => {
    const binary = encodeDictionaryBinary(SAMPLE_ENTRIES)
    const view = new DataView(binary.buffer)
    const first = view.getUint32(64, true)
    const second = view.getUint32(68, true)
    view.setUint32(64, second, true)
    view.setUint32(68, first, true)
    refreshPayloadCrc(binary)

    expect(() => decodeDictionaryBinary(binary)).toThrow('Codepoints table must be strictly increasing')
  })
})
