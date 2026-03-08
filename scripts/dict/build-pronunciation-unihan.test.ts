import { describe, expect, it } from 'vitest'
import { collectReadingTokens, parseCnsRows, parseUnihanRows } from './build-pronunciation-unihan.mts'

describe('build-pronunciation-unihan', () => {
  it('parses kXHC1983 tokens with multiple location markers', () => {
    const tokens = collectReadingTokens('kXHC1983', '1092.070*,1092.071:song2 0295.011:fa1')

    expect(tokens).toEqual([
      { reading: 'song2', frequency: 0, index: 0 },
      { reading: 'fa1', frequency: 0, index: 1 },
    ])
  })

  it('adds kTGHZ2013 and kXHC1983 readings for non-BMP characters', () => {
    const rows = parseUnihanRows(
      [
        'U+200CB\tkXHC1983\t0001.001:qiu1',
        'U+200CB\tkTGHZ2013\t100.010:qiu1 100.020:qiu2',
      ].join('\n'),
    )

    expect(rows).toEqual([
      {
        char: '𠃋',
        pinyinDisplay: 'qiū',
        pinyinAscii: 'qiu1',
        zhuyinDisplay: 'ㄑㄧㄡ',
        source: 'unihan:kTGHZ2013',
      },
      {
        char: '𠃋',
        pinyinDisplay: 'qiú',
        pinyinAscii: 'qiu2',
        zhuyinDisplay: 'ㄑㄧㄡˊ',
        source: 'unihan:kTGHZ2013',
      },
    ])
  })

  it('keeps kMandarin as the preferred source when duplicate readings exist', () => {
    const rows = parseUnihanRows(
      [
        'U+4E0A\tkMandarin\tshang4',
        'U+4E0A\tkTGHZ2013\t326.050:shang3 326.090:shang4',
      ].join('\n'),
    )

    expect(rows).toEqual([
      {
        char: '上',
        pinyinDisplay: 'shàng',
        pinyinAscii: 'shang4',
        zhuyinDisplay: 'ㄕㄤˋ',
        source: 'unihan:kMandarin',
      },
      {
        char: '上',
        pinyinDisplay: 'shǎng',
        pinyinAscii: 'shang3',
        zhuyinDisplay: 'ㄕㄤˇ',
        source: 'unihan:kTGHZ2013',
      },
    ])
  })

  it('maps CNS phonetic rows to unicode characters and hanyu pinyin', () => {
    const rows = parseCnsRows(
      ['1-4421\tㄧ', '1-4421\tㄧˊ', '3-2144\tㄑㄧㄡ'].join('\n'),
      new Map([
        ['1-4421', '一'],
        ['3-2144', '𠀋'],
      ]),
      new Map([
        ['ㄧ', 'yī'],
        ['ㄧˊ', 'yí'],
        ['ㄑㄧㄡ', 'qiū'],
      ]),
    )

    expect(rows).toEqual([
      {
        char: '一',
        pinyinDisplay: 'yī',
        pinyinAscii: 'yi1',
        zhuyinDisplay: 'ㄧ',
        source: 'cns11643:phonetic+han',
      },
      {
        char: '一',
        pinyinDisplay: 'yí',
        pinyinAscii: 'yi2',
        zhuyinDisplay: 'ㄧˊ',
        source: 'cns11643:phonetic+han',
      },
      {
        char: '𠀋',
        pinyinDisplay: 'qiū',
        pinyinAscii: 'qiu1',
        zhuyinDisplay: 'ㄑㄧㄡ',
        source: 'cns11643:phonetic+han',
      },
    ])
  })
})
