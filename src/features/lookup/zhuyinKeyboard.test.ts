import { describe, expect, it } from 'vitest'
import { formatKeySequence, zhuyinToKeySequence } from './zhuyinKeyboard'

describe('zhuyinKeyboard.ts', () => {
  it('maps standard zhuyin syllables to keyboard keys', () => {
    expect(zhuyinToKeySequence('ㄓㄨㄥ')).toBe('5j/')
    expect(zhuyinToKeySequence('ㄏㄠˇ')).toBe('cl3')
  })

  it('keeps the neutral tone prefix in key order', () => {
    expect(zhuyinToKeySequence('˙ㄇㄚ')).toBe('7a8')
  })

  it('formats key sequences for UI hints', () => {
    expect(formatKeySequence('5j/')).toBe('5 j /')
  })

  it('ignores spaces inside zhuyin strings', () => {
    expect(zhuyinToKeySequence('ㄏㄠ ˇ')).toBe('cl3')
  })

  it('throws on unsupported symbols', () => {
    expect(() => zhuyinToKeySequence('abc')).toThrow('Unsupported Zhuyin symbol: a')
  })

  it('throws on empty zhuyin input', () => {
    expect(() => zhuyinToKeySequence('   ')).toThrow('Zhuyin input must not be empty')
  })
})
