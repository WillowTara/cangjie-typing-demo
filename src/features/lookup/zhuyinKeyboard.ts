// Mapping table for the standard Taiwan Bopomofo keyboard layout used by
// Windows and many traditional Chinese input methods.
const ZHUYIN_KEYBOARD_LAYOUT = {
  ㄅ: '1',
  ㄆ: 'q',
  ㄇ: 'a',
  ㄈ: 'z',
  ㄉ: '2',
  ㄊ: 'w',
  ㄋ: 's',
  ㄌ: 'x',
  ㄍ: 'e',
  ㄎ: 'd',
  ㄏ: 'c',
  ㄐ: 'r',
  ㄑ: 'f',
  ㄒ: 'v',
  ㄓ: '5',
  ㄔ: 't',
  ㄕ: 'g',
  ㄖ: 'b',
  ㄗ: 'y',
  ㄘ: 'h',
  ㄙ: 'n',
  ㄧ: 'u',
  ㄨ: 'j',
  ㄩ: 'm',
  ㄚ: '8',
  ㄛ: 'i',
  ㄜ: 'k',
  ㄝ: ',',
  ㄞ: '9',
  ㄟ: 'o',
  ㄠ: 'l',
  ㄡ: '.',
  ㄢ: '0',
  ㄣ: 'p',
  ㄤ: ';',
  ㄥ: '/',
  ㄦ: '-',
  '˙': '7',
  'ˊ': '6',
  'ˇ': '3',
  'ˋ': '4',
} as const

const ZHUYIN_TONE_MARKS = new Set(['˙', 'ˊ', 'ˇ', 'ˋ'])

export function zhuyinToKeySequence(zhuyin: string): string {
  const normalized = zhuyin.trim().normalize('NFC')
  if (!normalized) {
    throw new Error('Zhuyin input must not be empty')
  }

  let keys = ''
  for (const symbol of Array.from(normalized)) {
    if (symbol === ' ') {
      continue
    }

    const mapped = ZHUYIN_KEYBOARD_LAYOUT[symbol as keyof typeof ZHUYIN_KEYBOARD_LAYOUT]
    if (!mapped) {
      throw new Error(`Unsupported Zhuyin symbol: ${symbol}`)
    }

    keys += mapped
  }

  return keys
}

export function formatKeySequence(keys: string): string {
  return Array.from(keys.trim()).join(' ')
}

export function isZhuyinToneMark(symbol: string): boolean {
  return ZHUYIN_TONE_MARKS.has(symbol)
}
