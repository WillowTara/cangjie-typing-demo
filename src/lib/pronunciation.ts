export const PRONUNCIATION_SCHEMA = 'cj-pronunciation@1' as const

export type PronunciationExample = {
  term: string
  pinyinDisplay?: string
  zhuyinDisplay?: string
  source: string
}

export type MandarinReading = {
  id: string
  pinyinDisplay: string
  pinyinAscii: string
  zhuyinDisplay: string
  zhuyinKeySequence: string
  source: string
  rank: number
  examples?: readonly PronunciationExample[]
}

export type PronunciationArtifactInfo = {
  file: string
  sha256: string
  bytes: number
}

export type PronunciationEntry = {
  mandarinReadings: readonly MandarinReading[]
}

export type PronunciationPayload = {
  schema: typeof PRONUNCIATION_SCHEMA
  dictVersion: string
  artifact: PronunciationArtifactInfo
  entries: Record<string, PronunciationEntry>
}

export type PronunciationIndex = Map<string, readonly MandarinReading[]>

export type PronunciationLookupFn = (char: string) => readonly MandarinReading[] | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${label} must not be empty`)
  }

  return normalized
}

function requireNormalizedDisplay(value: unknown, label: string): string {
  return requireString(value, label).normalize('NFC')
}

function requireFiniteRank(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }

  return value
}

function requireArtifactInfo(value: unknown): PronunciationArtifactInfo {
  if (!isRecord(value)) {
    throw new Error('artifact must be an object')
  }

  const bytes = value.bytes
  if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 0) {
    throw new Error('artifact.bytes must be a non-negative integer')
  }

  return {
    file: requireString(value.file, 'artifact.file'),
    sha256: requireString(value.sha256, 'artifact.sha256').toLowerCase(),
    bytes,
  }
}

function hasExactlyOneUnicodeChar(value: string): boolean {
  return Array.from(value).length === 1
}

function normalizeReadingKey(reading: MandarinReading): string {
  return `${reading.pinyinAscii}\u0000${reading.zhuyinDisplay}\u0000${reading.zhuyinKeySequence}`
}

function compareReadings(left: MandarinReading, right: MandarinReading): number {
  return (
    left.rank - right.rank ||
    left.pinyinDisplay.localeCompare(right.pinyinDisplay, 'zh-Hant') ||
    left.zhuyinDisplay.localeCompare(right.zhuyinDisplay, 'zh-Hant') ||
    left.id.localeCompare(right.id, 'en')
  )
}

function validateExamples(value: unknown, label: string): readonly PronunciationExample[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array when provided`)
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${label}[${index}] must be an object`)
    }

    const pinyinDisplay = item.pinyinDisplay
    const zhuyinDisplay = item.zhuyinDisplay

    return {
      term: requireNormalizedDisplay(item.term, `${label}[${index}].term`),
      pinyinDisplay:
        pinyinDisplay === undefined
          ? undefined
          : requireNormalizedDisplay(pinyinDisplay, `${label}[${index}].pinyinDisplay`),
      zhuyinDisplay:
        zhuyinDisplay === undefined
          ? undefined
          : requireNormalizedDisplay(zhuyinDisplay, `${label}[${index}].zhuyinDisplay`),
      source: requireString(item.source, `${label}[${index}].source`),
    }
  })
}

function validateReading(value: unknown, label: string): MandarinReading {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }

  return {
    id: requireString(value.id, `${label}.id`),
    pinyinDisplay: requireNormalizedDisplay(value.pinyinDisplay, `${label}.pinyinDisplay`),
    pinyinAscii: requireString(value.pinyinAscii, `${label}.pinyinAscii`).toLowerCase(),
    zhuyinDisplay: requireNormalizedDisplay(value.zhuyinDisplay, `${label}.zhuyinDisplay`),
    zhuyinKeySequence: requireString(value.zhuyinKeySequence, `${label}.zhuyinKeySequence`).toLowerCase(),
    source: requireString(value.source, `${label}.source`),
    rank: requireFiniteRank(value.rank, `${label}.rank`),
    examples: validateExamples(value.examples, `${label}.examples`),
  }
}

function validateEntry(value: unknown, label: string): PronunciationEntry {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }

  const rawReadings = value.mandarinReadings
  if (!Array.isArray(rawReadings) || rawReadings.length === 0) {
    throw new Error(`${label}.mandarinReadings must be a non-empty array`)
  }

  const mandarinReadings = rawReadings.map((reading, index) =>
    validateReading(reading, `${label}.mandarinReadings[${index}]`),
  )

  const dedupe = new Set<string>()
  for (const reading of mandarinReadings) {
    const key = normalizeReadingKey(reading)
    if (dedupe.has(key)) {
      throw new Error(`${label}.mandarinReadings contains duplicate normalized readings`)
    }
    dedupe.add(key)
  }

  return {
    mandarinReadings: [...mandarinReadings].sort(compareReadings),
  }
}

export function validatePronunciationPayload(payload: unknown): PronunciationPayload {
  if (!isRecord(payload)) {
    throw new Error('Pronunciation payload must be an object')
  }

  if (payload.schema !== PRONUNCIATION_SCHEMA) {
    throw new Error(`Pronunciation payload schema must be ${PRONUNCIATION_SCHEMA}`)
  }

  const entriesValue = payload.entries
  if (!isRecord(entriesValue)) {
    throw new Error('entries must be an object map')
  }

  const entryRecords = Object.entries(entriesValue)
  if (entryRecords.length === 0) {
    throw new Error('Pronunciation payload must contain at least one entry')
  }

  const entries: Record<string, PronunciationEntry> = {}
  for (const [char, entryValue] of entryRecords) {
    if (!hasExactlyOneUnicodeChar(char)) {
      throw new Error(`entries key must be exactly one Unicode character: ${char}`)
    }

    entries[char] = validateEntry(entryValue, `entries.${char}`)
  }

  return {
    schema: PRONUNCIATION_SCHEMA,
    dictVersion: requireString(payload.dictVersion, 'dictVersion'),
    artifact: requireArtifactInfo(payload.artifact),
    entries,
  }
}

export function buildPronunciationIndex(payload: PronunciationPayload): PronunciationIndex {
  const index: PronunciationIndex = new Map()

  for (const [char, entry] of Object.entries(payload.entries)) {
    index.set(char, entry.mandarinReadings)
  }

  if (index.size === 0) {
    throw new Error('Pronunciation payload must contain at least one indexed entry')
  }

  return index
}

export function createPronunciationLookup(index: PronunciationIndex): PronunciationLookupFn {
  return (char: string) => index.get(char)
}
