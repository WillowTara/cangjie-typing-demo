export const DICTIONARY_SCHEMA_VERSION = 'v1' as const

export type DictionaryEntry = {
  char: string
  cangjie: string
  quick: string
}

export type DictionaryIndex = {
  map: Map<string, { cangjie: string; quick: string }>
  size: number
}

// Lookup abstraction - allows UI to query without knowing storage implementation
/**
 * Result of a dictionary lookup for a single character.
 */
export type LookupResult = {
  cangjie: string
  quick: string
}

/**
 * Abstract lookup function - UI uses this to query dictionary.
 * This decouples UI from concrete storage (Map vs binary index).
 */
export type DictionaryLookupFn = (char: string) => LookupResult | undefined

/**
 * Dictionary source interface - provides lookup abstraction.
 */
export type DictionarySource = {
  lookup: DictionaryLookupFn
  size: number
}

export type DictionaryFormat = 'csv' | 'json'

export type DictionaryIssueCode =
  | 'EMPTY_INPUT'
  | 'ROW_TOO_SHORT'
  | 'INVALID_CHAR'
  | 'MISSING_CANGJIE'
  | 'INVALID_CANGJIE'
  | 'INVALID_QUICK_DERIVED'
  | 'QUICK_DERIVED'
  | 'DUPLICATE_CHAR_OVERRIDDEN'
  | 'JSON_PARSE_FAILED'
  | 'NO_VALID_ENTRIES'

export type DictionaryValidationIssue = {
  code: DictionaryIssueCode
  severity: 'error' | 'warning'
  row: number | null
  char: string | null
  message: string
}

export type DictionaryImportReport = {
  schemaVersion: typeof DICTIONARY_SCHEMA_VERSION
  format: DictionaryFormat
  totalRows: number
  acceptedRows: number
  rejectedRows: number
  duplicateOverrides: number
  cleanedRows: number
  issues: DictionaryValidationIssue[]
}

export type DictionaryParseResult = {
  entries: DictionaryEntry[]
  report: DictionaryImportReport
}

type RawRow = {
  row: number
  char: unknown
  cangjie: unknown
  quick: unknown
}

const CJK_SINGLE_CHAR_PATTERN = /^[\u3400-\u9fff\uf900-\ufaff]$/u
const CODE_PATTERN = /^[A-Z]{1,5}$/u

function createReport(format: DictionaryFormat): DictionaryImportReport {
  return {
    schemaVersion: DICTIONARY_SCHEMA_VERSION,
    format,
    totalRows: 0,
    acceptedRows: 0,
    rejectedRows: 0,
    duplicateOverrides: 0,
    cleanedRows: 0,
    issues: [],
  }
}

function addIssue(report: DictionaryImportReport, issue: DictionaryValidationIssue): void {
  report.issues.push(issue)
}

function normalizeChar(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const chars = Array.from(trimmed)
  if (chars.length !== 1) {
    return null
  }

  const [char] = chars
  if (!char || !CJK_SINGLE_CHAR_PATTERN.test(char)) {
    return null
  }

  return char
}

function normalizeCode(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/gu, '').toUpperCase()
}

function deriveQuickFromCangjie(cangjie: string): string {
  const chars = Array.from(cangjie)
  if (chars.length <= 2) {
    return cangjie
  }

  const first = chars[0]
  const last = chars[chars.length - 1]
  return `${first}${last}`
}

function splitLine(line: string): string[] {
  const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : ','
  return line.split(delimiter).map((item) => item.trim())
}

function looksLikeHeader(parts: string[]): boolean {
  const lowered = parts.map((part) => part.toLowerCase())
  return lowered.includes('char') || lowered.includes('cangjie') || lowered.includes('quick')
}

function normalizeRows(rows: RawRow[], report: DictionaryImportReport): DictionaryEntry[] {
  const map = new Map<string, DictionaryEntry>()

  for (const row of rows) {
    report.totalRows += 1

    const char = normalizeChar(row.char)
    if (!char) {
      report.rejectedRows += 1
      addIssue(report, {
        code: 'INVALID_CHAR',
        severity: 'error',
        row: row.row,
        char: null,
        message: 'Char must be one CJK character',
      })
      continue
    }

    const cangjie = normalizeCode(row.cangjie)
    if (!cangjie) {
      report.rejectedRows += 1
      addIssue(report, {
        code: 'MISSING_CANGJIE',
        severity: 'error',
        row: row.row,
        char,
        message: 'Cangjie code is required',
      })
      continue
    }

    if (!CODE_PATTERN.test(cangjie)) {
      report.rejectedRows += 1
      addIssue(report, {
        code: 'INVALID_CANGJIE',
        severity: 'error',
        row: row.row,
        char,
        message: 'Cangjie code must be A-Z and 1-5 chars',
      })
      continue
    }

    let quick = normalizeCode(row.quick)
    if (!quick) {
      quick = deriveQuickFromCangjie(cangjie)
      report.cleanedRows += 1
      addIssue(report, {
        code: 'QUICK_DERIVED',
        severity: 'warning',
        row: row.row,
        char,
        message: 'Quick code missing, derived from Cangjie',
      })
    } else if (!CODE_PATTERN.test(quick)) {
      quick = deriveQuickFromCangjie(cangjie)
      report.cleanedRows += 1
      addIssue(report, {
        code: 'INVALID_QUICK_DERIVED',
        severity: 'warning',
        row: row.row,
        char,
        message: 'Quick code invalid, derived from Cangjie',
      })
    }

    if (map.has(char)) {
      report.duplicateOverrides += 1
      addIssue(report, {
        code: 'DUPLICATE_CHAR_OVERRIDDEN',
        severity: 'warning',
        row: row.row,
        char,
        message: 'Duplicate char found, latest row overrides previous row',
      })
    }

    map.set(char, { char, cangjie, quick })
  }

  report.acceptedRows = map.size
  if (report.acceptedRows === 0) {
    addIssue(report, {
      code: 'NO_VALID_ENTRIES',
      severity: 'error',
      row: null,
      char: null,
      message: 'No valid entries after validation',
    })
    throw new Error('No valid entries after validation')
  }

  return Array.from(map.values())
}

export function parseDictionaryCsvWithReport(text: string): DictionaryParseResult {
  const report = createReport('csv')
  const normalizedText = text.replace(/^\uFEFF/u, '').trim()

  if (!normalizedText) {
    addIssue(report, {
      code: 'EMPTY_INPUT',
      severity: 'error',
      row: null,
      char: null,
      message: 'CSV input is empty',
    })
    throw new Error('CSV input is empty')
  }

  const lines = normalizedText.split(/\r?\n/u)
  const rows: RawRow[] = []
  let headerConsumed = false

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]?.trim() ?? ''
    if (!raw) {
      continue
    }

    const parts = splitLine(raw)
    if (!headerConsumed && looksLikeHeader(parts)) {
      headerConsumed = true
      continue
    }

    if (parts.length < 2) {
      addIssue(report, {
        code: 'ROW_TOO_SHORT',
        severity: 'warning',
        row: index + 1,
        char: null,
        message: 'Row skipped: expected at least char and cangjie columns',
      })
      continue
    }

    const [char, cangjie, quick] = parts
    rows.push({
      row: index + 1,
      char,
      cangjie,
      quick: quick ?? '',
    })
  }

  return {
    entries: normalizeRows(rows, report),
    report,
  }
}

export function parseDictionaryJsonWithReport(text: string): DictionaryParseResult {
  const report = createReport('json')
  const normalizedText = text.replace(/^\uFEFF/u, '').trim()

  if (!normalizedText) {
    addIssue(report, {
      code: 'EMPTY_INPUT',
      severity: 'error',
      row: null,
      char: null,
      message: 'JSON input is empty',
    })
    throw new Error('JSON input is empty')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(normalizedText) as unknown
  } catch {
    addIssue(report, {
      code: 'JSON_PARSE_FAILED',
      severity: 'error',
      row: null,
      char: null,
      message: 'JSON parse failed',
    })
    throw new Error('JSON parse failed')
  }

  const rows: RawRow[] = []

  if (Array.isArray(parsed)) {
    for (let index = 0; index < parsed.length; index += 1) {
      const item = parsed[index]
      if (!item || typeof item !== 'object') {
        addIssue(report, {
          code: 'ROW_TOO_SHORT',
          severity: 'warning',
          row: index + 1,
          char: null,
          message: 'Array entry skipped: not an object row',
        })
        continue
      }

      const row = item as Record<string, unknown>
      rows.push({
        row: index + 1,
        char: row.char,
        cangjie: row.cangjie,
        quick: row.quick,
      })
    }
  } else if (parsed && typeof parsed === 'object') {
    const records = Object.entries(parsed as Record<string, unknown>)
    for (let index = 0; index < records.length; index += 1) {
      const [char, value] = records[index] as [string, unknown]
      if (!value || typeof value !== 'object') {
        addIssue(report, {
          code: 'ROW_TOO_SHORT',
          severity: 'warning',
          row: index + 1,
          char,
          message: 'Object-map entry skipped: value must be an object',
        })
        continue
      }

      const row = value as Record<string, unknown>
      rows.push({
        row: index + 1,
        char,
        cangjie: row.cangjie,
        quick: row.quick,
      })
    }
  }

  return {
    entries: normalizeRows(rows, report),
    report,
  }
}

export function parseDictionaryTextWithReport(
  filename: string,
  text: string,
): DictionaryParseResult {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return parseDictionaryCsvWithReport(text)
  }

  if (lower.endsWith('.json')) {
    return parseDictionaryJsonWithReport(text)
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseDictionaryJsonWithReport(text)
  }

  return parseDictionaryCsvWithReport(text)
}

export function parseDictionaryCsv(text: string): DictionaryEntry[] {
  return parseDictionaryCsvWithReport(text).entries
}

export function parseDictionaryJson(text: string): DictionaryEntry[] {
  return parseDictionaryJsonWithReport(text).entries
}

export function parseDictionaryText(filename: string, text: string): DictionaryEntry[] {
  return parseDictionaryTextWithReport(filename, text).entries
}

export function buildDictionaryIndex(entries: DictionaryEntry[]): DictionaryIndex {
  const map = new Map<string, { cangjie: string; quick: string }>()

  for (const entry of entries) {
    map.set(entry.char, {
      cangjie: entry.cangjie,
      quick: entry.quick,
    })
  }

  if (map.size === 0) {
    throw new Error('No valid dictionary entries to index')
  }

  return { map, size: map.size }
}
