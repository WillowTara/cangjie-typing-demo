import { describe, it, expect } from 'vitest'
import {
  parseDictionaryCsv,
  parseDictionaryJson,
  parseDictionaryTextWithReport,
  buildDictionaryIndex,
  parseDictionaryCsvWithReport,
} from './dictionary'

describe('dictionary.ts - CSV parsing', () => {
  it('parses valid CSV with header', () => {
    const csv = `char,cangjie,quick
日,A,A
月,B,B`
    const entries = parseDictionaryCsv(csv)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ char: '日', cangjie: 'A', quick: 'A' })
    expect(entries[1]).toEqual({ char: '月', cangjie: 'B', quick: 'B' })
  })

  it('parses CSV without header', () => {
    const csv = `日,A,A
月,B,B`
    const entries = parseDictionaryCsv(csv)
    expect(entries).toHaveLength(2)
  })

  it('handles tab-separated values', () => {
    const tsv = `日\tA\tA\n月\tB\tB`
    const entries = parseDictionaryCsv(tsv)
    expect(entries).toHaveLength(2)
  })

  it('derives quick code when missing', () => {
    const csv = `日,A
月,B`
    const entries = parseDictionaryCsv(csv)
    expect(entries[0].quick).toBe('A')
    expect(entries[1].quick).toBe('B')
  })

  it('derives quick from cangjie for multi-letter codes', () => {
    const csv = `明,AB
林,DD`
    const entries = parseDictionaryCsv(csv)
    expect(entries[0].quick).toBe('AB') // 2 letters keep as-is
    expect(entries[1].quick).toBe('DD') // 2 letters keep as-is
  })

  it('handles duplicate characters - last wins', () => {
    const csv = `日,A,A
日,B,B`
    const entries = parseDictionaryCsv(csv)
    expect(entries).toHaveLength(1)
    expect(entries[0].cangjie).toBe('B')
  })

  it('normalizes cangjie code to uppercase', () => {
    const csv = `日,a,a`
    const entries = parseDictionaryCsv(csv)
    expect(entries[0].cangjie).toBe('A')
  })

  it('rejects invalid characters', () => {
    const csv = `abc,AB,AB
日,A,A`
    const entries = parseDictionaryCsv(csv)
    expect(entries).toHaveLength(1)
    expect(entries[0].char).toBe('日')
  })

  it('rejects cangjie codes over 5 letters', () => {
    const csv = `日,ABCDEF,A
月,B,B` // 6 letters - invalid, but one valid row
    const entries = parseDictionaryCsv(csv)
    expect(entries).toHaveLength(1) // Only the valid row
    expect(entries[0].char).toBe('月')
  })

  it('throws on empty input', () => {
    expect(() => parseDictionaryCsv('')).toThrow()
  })
})

describe('dictionary.ts - JSON parsing', () => {
  it('parses JSON array format', () => {
    const json = `[
      { "char": "日", "cangjie": "A", "quick": "A" },
      { "char": "月", "cangjie": "B", "quick": "B" }
    ]`
    const entries = parseDictionaryJson(json)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ char: '日', cangjie: 'A', quick: 'A' })
  })

  it('parses JSON object map format', () => {
    const json = `{
      "日": { "cangjie": "A", "quick": "A" },
      "月": { "cangjie": "B", "quick": "B" }
    }`
    const entries = parseDictionaryJson(json)
    expect(entries).toHaveLength(2)
  })

  it('derives quick when missing in JSON', () => {
    const json = `[{ "char": "明", "cangjie": "AB" }]`
    const entries = parseDictionaryJson(json)
    expect(entries[0].quick).toBe('AB')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseDictionaryJson('not json')).toThrow()
  })

  it('throws on empty input', () => {
    expect(() => parseDictionaryJson('')).toThrow()
  })
})

describe('dictionary.ts - auto-detect format', () => {
  it('detects CSV by .csv extension', () => {
    const entries = parseDictionaryTextWithReport('dict.csv', '日,A,A')
    expect(entries.entries).toHaveLength(1)
    expect(entries.report.format).toBe('csv')
  })

  it('detects JSON by .json extension', () => {
    const entries = parseDictionaryTextWithReport('dict.json', '[{ "char": "日", "cangjie": "A" }]')
    expect(entries.entries).toHaveLength(1)
    expect(entries.report.format).toBe('json')
  })

  it('detects JSON by content', () => {
    const entries = parseDictionaryTextWithReport('dict.txt', '[{ "char": "日", "cangjie": "A" }]')
    expect(entries.report.format).toBe('json')
    expect(entries.entries).toHaveLength(1)
  })

  it('defaults to CSV for unknown extensions', () => {
    const entries = parseDictionaryTextWithReport('dict.txt', '日,A,A')
    expect(entries.report.format).toBe('csv')
  })
})

describe('dictionary.ts - buildDictionaryIndex', () => {
  it('builds index from entries', () => {
    const entries = [
      { char: '日', cangjie: 'A', quick: 'A' },
      { char: '月', cangjie: 'B', quick: 'B' },
    ]
    const index = buildDictionaryIndex(entries)
    expect(index.size).toBe(2)
    expect(index.map.get('日')).toEqual({ cangjie: 'A', quick: 'A' })
    expect(index.map.get('月')).toEqual({ cangjie: 'B', quick: 'B' })
  })

  it('throws on empty entries', () => {
    expect(() => buildDictionaryIndex([])).toThrow()
  })
})

describe('dictionary.ts - import report', () => {
  it('reports accepted rows', () => {
    const csv = `日,A,A
月,B,B`
    const result = parseDictionaryCsvWithReport(csv)
    expect(result.report.totalRows).toBe(2)
    expect(result.report.acceptedRows).toBe(2)
    expect(result.report.rejectedRows).toBe(0)
  })

  it('reports duplicate overrides', () => {
    const csv = `日,A,A
日,B,B`
    const result = parseDictionaryCsvWithReport(csv)
    expect(result.report.duplicateOverrides).toBe(1)
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_CHAR_OVERRIDDEN', severity: 'warning' })
    )
  })

  it('reports missing quick derivation', () => {
    const csv = `日,A`
    const result = parseDictionaryCsvWithReport(csv)
    expect(result.report.cleanedRows).toBe(1)
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: 'QUICK_DERIVED', severity: 'warning' })
    )
  })

  it('reports invalid characters', () => {
    const csv = `abc,AB,AB
日,A,A`
    const result = parseDictionaryCsvWithReport(csv)
    expect(result.report.rejectedRows).toBe(1)
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_CHAR', severity: 'error' })
    )
  })
})
