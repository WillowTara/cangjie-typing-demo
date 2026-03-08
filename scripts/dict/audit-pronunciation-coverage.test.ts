import { describe, expect, it } from 'vitest'
import { buildMissingRecords, getCjkBlock, parseDictionaryChars, summarizeCoverage } from './audit-pronunciation-coverage.mts'

describe('audit-pronunciation-coverage', () => {
  it('parses dictionary chars and ignores headers', () => {
    const chars = parseDictionaryChars(['char,cangjie,quick', '上,卜山,卜山', '𠃋,X,X', '', '上,卜山,卜山'].join('\n'))

    expect(new Set(chars)).toEqual(new Set(['上', '𠃋']))
  })

  it('classifies representative CJK blocks correctly', () => {
    expect(getCjkBlock(0x3007)).toBe('U+3007')
    expect(getCjkBlock(0x352b)).toBe('ExtA')
    expect(getCjkBlock(0x9fb1)).toBe('URO')
    expect(getCjkBlock(0x200cb)).toBe('ExtB')
  })

  it('summarizes missing pronunciation coverage across BMP and ExtB blocks', () => {
    const dictionaryChars = ['上', '㔫', '𠃋']
    const pronunciationChars = new Set(['上'])
    const missingRecords = buildMissingRecords(dictionaryChars, pronunciationChars)
    const summary = summarizeCoverage(dictionaryChars, pronunciationChars, missingRecords)

    expect(summary).toEqual({
      dictionaryCharCount: 3,
      pronunciationEntryCount: 1,
      missingCount: 2,
      coverageRatio: 0.333333,
      blocks: {
        ExtA: 1,
        ExtB: 1,
      },
    })
  })
})
