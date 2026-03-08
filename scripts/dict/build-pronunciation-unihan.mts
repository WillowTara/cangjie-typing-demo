#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PRONUNCIATION_SCHEMA } from '../../src/lib/pronunciation.ts'
import { zhuyinToKeySequence } from '../../src/features/lookup/zhuyinKeyboard.ts'

type SourceMetadata = {
  id: string
  name: string
  license: string
  version: string
  sha256?: string
  url?: string
}

type SourcesManifest = {
  schema?: string
  sources: SourceMetadata[]
}

type InputRow = {
  char: string
  pinyinDisplay: string
  pinyinAscii: string
  zhuyinDisplay: string
  source?: string
}

type UnihanField = 'kMandarin' | 'kHanyuPinyin' | 'kHanyuPinlu' | 'kXHC1983' | 'kTGHZ2013'

type ReadingCandidate = {
  pinyinAscii: string
  source: UnihanField
  primary: number
  secondary: number
  tertiary: number
}

const UNIHAN_FIELDS: ReadonlySet<UnihanField> = new Set([
  'kMandarin',
  'kHanyuPinyin',
  'kHanyuPinlu',
  'kXHC1983',
  'kTGHZ2013',
])

const PINYIN_TONE_MARKS = new Map<string, readonly [base: string, tone: string]>([
  ['ā', ['a', '1']],
  ['á', ['a', '2']],
  ['ǎ', ['a', '3']],
  ['à', ['a', '4']],
  ['ē', ['e', '1']],
  ['é', ['e', '2']],
  ['ě', ['e', '3']],
  ['è', ['e', '4']],
  ['ī', ['i', '1']],
  ['í', ['i', '2']],
  ['ǐ', ['i', '3']],
  ['ì', ['i', '4']],
  ['ō', ['o', '1']],
  ['ó', ['o', '2']],
  ['ǒ', ['o', '3']],
  ['ò', ['o', '4']],
  ['ū', ['u', '1']],
  ['ú', ['u', '2']],
  ['ǔ', ['u', '3']],
  ['ù', ['u', '4']],
  ['ǖ', ['v', '1']],
  ['ǘ', ['v', '2']],
  ['ǚ', ['v', '3']],
  ['ǜ', ['v', '4']],
  ['ü', ['v', '5']],
  ['ê', ['e', '5']],
])

const PINYIN_VOWEL_TONE_MARKS: Record<string, readonly [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

const ZHUYIN_INITIALS: ReadonlyMap<string, string> = new Map([
  ['b', 'ㄅ'],
  ['p', 'ㄆ'],
  ['m', 'ㄇ'],
  ['f', 'ㄈ'],
  ['d', 'ㄉ'],
  ['t', 'ㄊ'],
  ['n', 'ㄋ'],
  ['l', 'ㄌ'],
  ['g', 'ㄍ'],
  ['k', 'ㄎ'],
  ['h', 'ㄏ'],
  ['j', 'ㄐ'],
  ['q', 'ㄑ'],
  ['x', 'ㄒ'],
  ['zh', 'ㄓ'],
  ['ch', 'ㄔ'],
  ['sh', 'ㄕ'],
  ['r', 'ㄖ'],
  ['z', 'ㄗ'],
  ['c', 'ㄘ'],
  ['s', 'ㄙ'],
  ['y', ''],
  ['w', ''],
  ['', ''],
])

const ZHUYIN_FINALS: ReadonlyMap<string, string> = new Map([
  ['a', 'ㄚ'],
  ['o', 'ㄛ'],
  ['e', 'ㄜ'],
  ['ai', 'ㄞ'],
  ['ei', 'ㄟ'],
  ['ao', 'ㄠ'],
  ['ou', 'ㄡ'],
  ['an', 'ㄢ'],
  ['en', 'ㄣ'],
  ['ang', 'ㄤ'],
  ['eng', 'ㄥ'],
  ['er', 'ㄦ'],
  ['i', 'ㄧ'],
  ['ia', 'ㄧㄚ'],
  ['ie', 'ㄧㄝ'],
  ['iao', 'ㄧㄠ'],
  ['iu', 'ㄧㄡ'],
  ['ian', 'ㄧㄢ'],
  ['in', 'ㄧㄣ'],
  ['iang', 'ㄧㄤ'],
  ['ing', 'ㄧㄥ'],
  ['iong', 'ㄩㄥ'],
  ['u', 'ㄨ'],
  ['ua', 'ㄨㄚ'],
  ['uo', 'ㄨㄛ'],
  ['uai', 'ㄨㄞ'],
  ['ui', 'ㄨㄟ'],
  ['uan', 'ㄨㄢ'],
  ['un', 'ㄨㄣ'],
  ['uang', 'ㄨㄤ'],
  ['ong', 'ㄨㄥ'],
  ['ueng', 'ㄨㄥ'],
  ['v', 'ㄩ'],
  ['ve', 'ㄩㄝ'],
  ['van', 'ㄩㄢ'],
  ['vn', 'ㄩㄣ'],
  ['', ''],
])

const TONE_TO_ZHUYIN_MARK: Record<string, string> = {
  '1': '',
  '2': 'ˊ',
  '3': 'ˇ',
  '4': 'ˋ',
  '5': '˙',
}

function getArg(args: string[], name: string, fallback: string): string {
  const index = args.findIndex((value) => value === name)
  return index < 0 ? fallback : (args[index + 1] ?? fallback)
}

function parseListArg(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/[;,]/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value.trim()
}

function normalizeSourcesManifest(raw: unknown, fallbackSha256: string): SourceMetadata[] {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as SourcesManifest).sources)) {
    throw new Error('Sources manifest must include non-empty sources[]')
  }

  const sources = (raw as SourcesManifest).sources
  if (sources.length === 0) {
    throw new Error('Sources manifest must include non-empty sources[]')
  }

  return sources.map((source, index) => ({
    id: requireString(source.id, `sources[${index}].id`),
    name: requireString(source.name, `sources[${index}].name`),
    license: requireString(source.license, `sources[${index}].license`),
    version: requireString(source.version, `sources[${index}].version`),
    sha256: typeof source.sha256 === 'string' && source.sha256.trim() ? source.sha256.trim() : fallbackSha256,
    ...(typeof source.url === 'string' && source.url.trim() ? { url: source.url.trim() } : {}),
  }))
}

function parseDictionaryChars(dictionaryText: string): Set<string> {
  const lines = dictionaryText.split(/\r?\n/u)
  const chars = new Set<string>()
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const parts = trimmed.split(',')
    if (parts[0]?.toLowerCase() === 'char') {
      continue
    }
    const char = parts[0]?.trim()
    if (char && Array.from(char).length === 1) {
      chars.add(char)
    }
  }
  return chars
}

function normalizePinyinAscii(raw: string): string | undefined {
  const lowered = raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/ü/gu, 'v')
    .replace(/u:/gu, 'v')
    .replace(/'/gu, '')

  if (!lowered) {
    return undefined
  }

  const digits = lowered.match(/[1-5]/gu)
  let explicitTone = digits ? digits[digits.length - 1] : undefined
  let toneFromMark: string | undefined
  let base = ''

  for (const symbol of Array.from(lowered)) {
    if ((symbol >= 'a' && symbol <= 'z') || symbol === 'v') {
      base += symbol
      continue
    }
    const marked = PINYIN_TONE_MARKS.get(symbol)
    if (marked) {
      const [plain, tone] = marked
      base += plain
      toneFromMark = tone
    }
  }

  if (!base || !/^[a-zv]+$/u.test(base)) {
    return undefined
  }

  if (!explicitTone) {
    explicitTone = toneFromMark ?? '5'
  }

  if (!/^[1-5]$/u.test(explicitTone)) {
    return undefined
  }

  return `${base}${explicitTone}`
}

function toPinyinDisplay(pinyinAscii: string): string {
  const normalized = normalizePinyinAscii(pinyinAscii)
  if (!normalized) {
    throw new Error(`Invalid pinyin ascii: ${pinyinAscii}`)
  }

  const tone = normalized.length > 0 ? normalized[normalized.length - 1] : '5'
  const syllable = normalized.slice(0, -1).replace(/v/gu, 'ü')

  if (tone === '5') {
    return syllable
  }

  const vowels = Array.from(syllable)
  let targetIndex = vowels.indexOf('a')
  if (targetIndex < 0) {
    targetIndex = vowels.indexOf('e')
  }
  if (targetIndex < 0) {
    const ou = syllable.indexOf('ou')
    if (ou >= 0) {
      targetIndex = ou
    }
  }
  if (targetIndex < 0) {
    for (let index = vowels.length - 1; index >= 0; index -= 1) {
      if (/[aeiouü]/u.test(vowels[index] ?? '')) {
        targetIndex = index
        break
      }
    }
  }

  if (targetIndex < 0) {
    return syllable
  }

  const targetVowel = vowels[targetIndex] ?? ''
  const toneRow = PINYIN_VOWEL_TONE_MARKS[targetVowel]
  if (!toneRow) {
    return syllable
  }

  vowels[targetIndex] = toneRow[Number(tone) - 1]
  return vowels.join('')
}

function splitInitial(base: string): { initial: string; final: string } {
  const digraph = base.slice(0, 2)
  if (digraph === 'zh' || digraph === 'ch' || digraph === 'sh') {
    return { initial: digraph, final: base.slice(2) }
  }

  const mono = base.slice(0, 1)
  if (ZHUYIN_INITIALS.has(mono)) {
    return { initial: mono, final: base.slice(1) }
  }

  return { initial: '', final: base }
}

function normalizeFinal(initial: string, rawFinal: string): string {
  let final = rawFinal

  if (initial === 'y') {
    if (!final) {
      return 'i'
    }
    if (final.startsWith('u')) {
      final = `v${final.slice(1)}`
    } else if (!final.startsWith('i')) {
      final = `i${final}`
    }
  } else if (initial === 'w') {
    if (!final) {
      return 'u'
    }
    if (!final.startsWith('u')) {
      final = `u${final}`
    }
  }

  if ((initial === 'j' || initial === 'q' || initial === 'x') && final.startsWith('u')) {
    final = `v${final.slice(1)}`
  }

  if (final === 'iou') {
    final = 'iu'
  } else if (final === 'uei') {
    final = 'ui'
  } else if (final === 'uen') {
    final = 'un'
  }

  if ((initial === 'zh' || initial === 'ch' || initial === 'sh' || initial === 'r' || initial === 'z' || initial === 'c' || initial === 's') && final === 'i') {
    return ''
  }

  return final
}

function toZhuyinDisplay(pinyinAscii: string): string | undefined {
  const normalized = normalizePinyinAscii(pinyinAscii)
  if (!normalized) {
    return undefined
  }

  const tone = normalized.length > 0 ? normalized[normalized.length - 1] : '5'
  const base = normalized.slice(0, -1)
  const { initial, final: rawFinal } = splitInitial(base)
  const final = normalizeFinal(initial, rawFinal)
  const initialZhuyin = ZHUYIN_INITIALS.get(initial)
  const finalZhuyin = ZHUYIN_FINALS.get(final)

  if (initialZhuyin === undefined || finalZhuyin === undefined) {
    return undefined
  }

  const toneMark = TONE_TO_ZHUYIN_MARK[tone]
  if (toneMark === undefined) {
    return undefined
  }

  return `${initialZhuyin}${finalZhuyin}${toneMark}`.normalize('NFC')
}

function compareReadingCandidates(left: ReadingCandidate, right: ReadingCandidate): number {
  return (
    left.primary - right.primary ||
    left.secondary - right.secondary ||
    left.tertiary - right.tertiary ||
    left.pinyinAscii.localeCompare(right.pinyinAscii, 'en')
  )
}

function parseUnihanChar(codepointToken: string): string | undefined {
  const match = /^U\+([0-9A-F]{4,6})$/iu.exec(codepointToken)
  if (!match) {
    return undefined
  }

  const codepoint = Number.parseInt(match[1], 16)
  if (!Number.isFinite(codepoint)) {
    return undefined
  }

  const char = String.fromCodePoint(codepoint)
  return Array.from(char).length === 1 ? char : undefined
}

function extractUnihanReadingValue(token: string): string {
  const separatorIndex = token.indexOf(':')
  return separatorIndex >= 0 ? token.slice(separatorIndex + 1) : token
}

function getFieldPriority(field: UnihanField): number {
  switch (field) {
    case 'kMandarin':
      return 0
    case 'kHanyuPinlu':
      return 1
    case 'kTGHZ2013':
      return 2
    case 'kXHC1983':
      return 3
    case 'kHanyuPinyin':
      return 4
  }
}

export function collectReadingTokens(field: UnihanField, value: string): Array<{ reading: string; frequency: number; index: number }> {
  const out: Array<{ reading: string; frequency: number; index: number }> = []

  if (field === 'kMandarin') {
    const tokens = value.split(/\s+/u).filter((token) => token.length > 0)
    for (let index = 0; index < tokens.length; index += 1) {
      out.push({ reading: tokens[index], frequency: 0, index })
    }
    return out
  }

  if (field === 'kHanyuPinyin') {
    const clusters = value.split(/\s+/u).filter((token) => token.length > 0)
    let globalIndex = 0
    for (const cluster of clusters) {
      const readingsPart = extractUnihanReadingValue(cluster)
      const tokens = readingsPart
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
      for (const token of tokens) {
        out.push({ reading: token, frequency: 0, index: globalIndex })
        globalIndex += 1
      }
    }
    return out
  }

  if (field === 'kXHC1983' || field === 'kTGHZ2013') {
    const clusters = value.split(/\s+/u).filter((token) => token.length > 0)
    for (let index = 0; index < clusters.length; index += 1) {
      const reading = extractUnihanReadingValue(clusters[index]).trim()
      if (!reading) {
        continue
      }
      out.push({ reading, frequency: 0, index })
    }
    return out
  }

  const pinluTokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

  for (let index = 0; index < pinluTokens.length; index += 1) {
    const match = /^([a-zA-Zü:]+[1-5]?)(?:\((\d+)\))?$/u.exec(pinluTokens[index])
    if (!match) {
      continue
    }
    out.push({ reading: match[1], frequency: Number.parseInt(match[2] ?? '0', 10) || 0, index })
  }

  return out
}

export function parseUnihanRows(inputText: string): InputRow[] {
  const byChar = new Map<string, Map<string, ReadingCandidate>>()
  const lines = inputText.split(/\r?\n/u)

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]?.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const parts = line.split('\t')
    if (parts.length < 3) {
      continue
    }

    const char = parseUnihanChar(parts[0])
    if (!char) {
      continue
    }

    const field = parts[1] as UnihanField
    if (!UNIHAN_FIELDS.has(field)) {
      continue
    }

    const value = parts[2]?.trim() ?? ''
    if (!value) {
      continue
    }

    const readings = collectReadingTokens(field, value)
    if (readings.length === 0) {
      continue
    }

    const charMap = byChar.get(char) ?? new Map<string, ReadingCandidate>()

    for (const reading of readings) {
      const pinyinAscii = normalizePinyinAscii(reading.reading)
      if (!pinyinAscii) {
        continue
      }

      const candidate: ReadingCandidate = {
        pinyinAscii,
        source: field,
        primary: getFieldPriority(field),
        secondary: field === 'kHanyuPinlu' ? -reading.frequency : reading.index,
        tertiary: lineIndex * 1024 + reading.index,
      }

      const existing = charMap.get(pinyinAscii)
      if (!existing || compareReadingCandidates(candidate, existing) < 0) {
        charMap.set(pinyinAscii, candidate)
      }
    }

    if (charMap.size > 0) {
      byChar.set(char, charMap)
    }
  }

  const rows: InputRow[] = []
  const chars = Array.from(byChar.keys()).sort((left, right) => left.localeCompare(right, 'zh-Hant'))

  for (const char of chars) {
    const candidates = Array.from(byChar.get(char)?.values() ?? []).sort(compareReadingCandidates)
    for (const candidate of candidates) {
      const zhuyinDisplay = toZhuyinDisplay(candidate.pinyinAscii)
      if (!zhuyinDisplay) {
        continue
      }

      rows.push({
        char,
        pinyinDisplay: toPinyinDisplay(candidate.pinyinAscii),
        pinyinAscii: candidate.pinyinAscii,
        zhuyinDisplay,
        source: `unihan:${candidate.source}`,
      })
    }
  }

  return rows
}

function parseJsonRows(inputText: string): InputRow[] {
  const rows = JSON.parse(inputText) as InputRow[]
  if (!Array.isArray(rows)) {
    throw new Error('Pronunciation input must be a JSON array')
  }
  return rows
}

function parseInputRows(inputText: string, inputPath: string): InputRow[] {
  const lower = inputPath.toLowerCase()
  if (lower.endsWith('.txt') || lower.endsWith('.tsv')) {
    return parseUnihanRows(inputText)
  }
  if (lower.endsWith('.json')) {
    return parseJsonRows(inputText)
  }
  throw new Error(`Unsupported pronunciation input format: ${inputPath}`)
}

function parseCnsUnicodeMaps(inputTexts: string[]): Map<string, string> {
  const out = new Map<string, string>()

  for (const inputText of inputTexts) {
    const lines = inputText.split(/\r?\n/u)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const parts = trimmed.split('\t')
      if (parts.length < 2) {
        continue
      }

      const cnsCode = parts[0]?.trim()
      const hexCodepoint = parts[1]?.trim()
      if (!cnsCode || !hexCodepoint || !/^\d+-[0-9A-F]{4}$/iu.test(cnsCode) || !/^[0-9A-F]{4,6}$/iu.test(hexCodepoint)) {
        continue
      }

      const codepoint = Number.parseInt(hexCodepoint, 16)
      if (!Number.isFinite(codepoint)) {
        continue
      }

      out.set(cnsCode.toUpperCase(), String.fromCodePoint(codepoint))
    }
  }

  return out
}

function parseCnsPinyinMap(inputText: string): Map<string, string> {
  const out = new Map<string, string>()
  const lines = inputText.split(/\r?\n/u)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const parts = trimmed.split('\t')
    if (parts.length < 2) {
      continue
    }

    const zhuyinDisplay = parts[0]?.trim().normalize('NFC')
    const hanyuDisplay = parts[1]?.trim().normalize('NFC')
    if (!zhuyinDisplay || !hanyuDisplay) {
      continue
    }

    out.set(zhuyinDisplay, hanyuDisplay)
  }

  return out
}

export function parseCnsRows(
  phoneticText: string,
  cnsCodeToChar: ReadonlyMap<string, string>,
  zhuyinToPinyinDisplay: ReadonlyMap<string, string>,
): InputRow[] {
  const out: InputRow[] = []
  const lines = phoneticText.split(/\r?\n/u)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const parts = trimmed.split('\t')
    if (parts.length < 2) {
      continue
    }

    const cnsCode = parts[0]?.trim().toUpperCase()
    const zhuyinDisplay = parts[1]?.trim().normalize('NFC')
    if (!cnsCode || !zhuyinDisplay) {
      continue
    }

    const char = cnsCodeToChar.get(cnsCode)
    if (!char || Array.from(char).length !== 1) {
      continue
    }

    const pinyinDisplay = zhuyinToPinyinDisplay.get(zhuyinDisplay)
    if (!pinyinDisplay) {
      continue
    }

    const pinyinAscii = normalizePinyinAscii(pinyinDisplay)
    if (!pinyinAscii) {
      continue
    }

    out.push({
      char,
      pinyinDisplay,
      pinyinAscii,
      zhuyinDisplay,
      source: 'cns11643:phonetic+han',
    })
  }

  return out
}

function filterRowsByDictionary(rows: InputRow[], dictionaryChars: Set<string> | undefined): InputRow[] {
  if (!dictionaryChars || dictionaryChars.size === 0) {
    return rows
  }
  return rows.filter((row) => dictionaryChars.has(row.char))
}

function buildEntries(rows: InputRow[]) {
  const grouped = new Map<string, InputRow[]>()
  for (const row of rows) {
    const char = requireString(row.char, 'row.char')
    if (Array.from(char).length !== 1) {
      throw new Error(`row.char must be exactly one Unicode character: ${char}`)
    }

    const existing = grouped.get(char) ?? []
    existing.push(row)
    grouped.set(char, existing)
  }

  if (grouped.size === 0) {
    throw new Error('No pronunciation rows found in input')
  }

  return Object.fromEntries(
    Array.from(grouped.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'zh-Hant'))
      .map(([char, readings]) => {
        const dedupe = new Set<string>()
        const mandarinReadings = readings
          .map((reading, index) => {
            const pinyinDisplay = requireString(reading.pinyinDisplay, `rows[${index}].pinyinDisplay`).normalize('NFC')
            const pinyinAscii = requireString(reading.pinyinAscii, `rows[${index}].pinyinAscii`).toLowerCase()
            const zhuyinDisplay = requireString(reading.zhuyinDisplay, `rows[${index}].zhuyinDisplay`).normalize('NFC')
            const key = `${pinyinAscii}\u0000${zhuyinDisplay}`
            if (dedupe.has(key)) {
              return undefined
            }
            dedupe.add(key)
            return {
              id: `${char}-${pinyinAscii}`,
              pinyinDisplay,
              pinyinAscii,
              zhuyinDisplay,
              zhuyinKeySequence: zhuyinToKeySequence(zhuyinDisplay),
              source: typeof reading.source === 'string' && reading.source.trim() ? reading.source.trim() : 'unihan',
              rank: index,
            }
          })
          .filter((reading) => reading !== undefined)

        if (mandarinReadings.length === 0) {
          throw new Error(`No readings remain after normalization for ${char}`)
        }

        return [char, { mandarinReadings }]
      }),
  )
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const input = getArg(args, '--input', 'public/dict/pronunciation-sample-unihan.json')
  const dictVersion = getArg(args, '--version', '2026.03.0')
  const outputDir = getArg(args, '--out-dir', 'public/dict')
  const dictionaryPath = normalizeOptionalString(getArg(args, '--dictionary', 'public/dict/full-dictionary.csv'))
  const defaultSources = input.replace(/\.[^./\\]+$/u, '.sources.json')
  const sourcesPath = getArg(args, '--sources', defaultSources)
  const cnsPhoneticPath = normalizeOptionalString(getArg(args, '--cns-phonetic', ''))
  const cnsPinyinPathArg = normalizeOptionalString(getArg(args, '--cns-pinyin', ''))
  const cnsUnicodeMapsArg = normalizeOptionalString(getArg(args, '--cns-unicode-maps', ''))

  const sourceText = await readFile(input, 'utf8')
  const sourceSha256 = createHash('sha256').update(sourceText).digest('hex')
  const sourceRows = parseInputRows(sourceText, input)

  let cnsRows: InputRow[] = []
  if (cnsPhoneticPath) {
    const cnsPhoneticText = await readFile(cnsPhoneticPath, 'utf8')
    const cnsPinyinPath =
      cnsPinyinPathArg ?? join(dirname(cnsPhoneticPath), 'CNS_pinyin_2.txt')
    const cnsPinyinText = await readFile(cnsPinyinPath, 'utf8')

    const cnsUnicodeMapPathsArg = parseListArg(cnsUnicodeMapsArg)
    const cnsUnicodeMapPaths =
      cnsUnicodeMapPathsArg.length > 0
        ? cnsUnicodeMapPathsArg
        : [
            join(dirname(cnsPhoneticPath), '../mapping/Unicode/CNS2UNICODE_Unicode BMP.txt'),
            join(dirname(cnsPhoneticPath), '../mapping/Unicode/CNS2UNICODE_Unicode 2.txt'),
            join(dirname(cnsPhoneticPath), '../mapping/Unicode/CNS2UNICODE_Unicode 3.txt'),
            join(dirname(cnsPhoneticPath), '../mapping/Unicode/CNS2UNICODE_Unicode 15.txt'),
          ]

    const cnsUnicodeMapTexts = await Promise.all(cnsUnicodeMapPaths.map((path) => readFile(path, 'utf8')))
    cnsRows = parseCnsRows(
      cnsPhoneticText,
      parseCnsUnicodeMaps(cnsUnicodeMapTexts),
      parseCnsPinyinMap(cnsPinyinText),
    )
  }

  const mergedSourceRows = [...sourceRows, ...cnsRows]

  let dictionaryChars: Set<string> | undefined
  if (dictionaryPath) {
    dictionaryChars = parseDictionaryChars(await readFile(dictionaryPath, 'utf8'))
  }

  const rows = filterRowsByDictionary(mergedSourceRows, dictionaryChars)
  const sources = normalizeSourcesManifest(JSON.parse(await readFile(sourcesPath, 'utf8')) as unknown, sourceSha256)
  const entries = buildEntries(rows)
  const preliminaryPayload = {
    schema: PRONUNCIATION_SCHEMA,
    dictVersion,
    artifact: { file: '', sha256: '', bytes: 0 },
    entries,
  }
  const preliminaryText = `${JSON.stringify(preliminaryPayload, null, 2)}\n`
  const shortHash = createHash('sha256').update(preliminaryText).digest('hex').slice(0, 8)
  const artifactFile = `pronunciation.${dictVersion}.${shortHash}.v1.json`
  const artifactText = `${JSON.stringify(
    {
      ...preliminaryPayload,
      artifact: {
        file: artifactFile,
        sha256: createHash('sha256').update(preliminaryText).digest('hex'),
        bytes: Buffer.byteLength(preliminaryText),
      },
    },
    null,
    2,
  )}\n`
  const artifactSha256 = createHash('sha256').update(artifactText).digest('hex')
  const artifactBytes = Buffer.byteLength(artifactText)
  const metaFile = `pronunciation.${dictVersion}.${shortHash}.meta.json`
  const licensesFile = `pronunciation.${dictVersion}.${shortHash}.licenses.json`

  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, artifactFile), artifactText, 'utf8')
  await writeFile(join(outputDir, 'pronunciation.latest.v1.json'), artifactText, 'utf8')
  await writeFile(
    join(outputDir, metaFile),
    `${JSON.stringify(
      {
        schema: 'cj-pronunciation-meta@1',
        dictVersion,
        artifact: { file: artifactFile, sha256: artifactSha256, bytes: artifactBytes },
        stats: {
          entryCount: Object.keys(entries).length,
          readingCount: Object.values(entries).reduce((sum, entry) => sum + entry.mandarinReadings.length, 0),
          sourceRowCount: mergedSourceRows.length,
          filteredRowCount: rows.length,
          dictionaryCharCount: dictionaryChars?.size ?? null,
          dictionaryCoverageRatio:
            dictionaryChars && dictionaryChars.size > 0 ? Number((Object.keys(entries).length / dictionaryChars.size).toFixed(6)) : null,
        },
        sources,
        build: {
          toolVersion: 'pronunciation-build/0.3.0',
          generatedAt: new Date().toISOString(),
          gitCommit: process.env.GIT_COMMIT ?? 'unknown',
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  await writeFile(join(outputDir, licensesFile), `${JSON.stringify({ schema: 'cj-pronunciation-licenses@1', sources }, null, 2)}\n`, 'utf8')

  process.stdout.write(
    `built ${artifactFile} (${Object.keys(entries).length} chars, ${rows.length} filtered rows from ${mergedSourceRows.length} source rows)\n`,
  )
}

const isDirectRun = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false

if (isDirectRun) {
  void main()
}
