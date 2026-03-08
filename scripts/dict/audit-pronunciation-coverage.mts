#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validatePronunciationPayload } from '../../src/lib/pronunciation.ts'

type MissingCharacterRecord = {
  char: string
  codepoint: string
  block: string
}

type CoverageSummary = {
  dictionaryCharCount: number
  pronunciationEntryCount: number
  missingCount: number
  coverageRatio: number
  blocks: Record<string, number>
}

function getArg(args: string[], name: string, fallback?: string): string | undefined {
  const index = args.findIndex((value) => value === name)
  if (index < 0) {
    return fallback
  }

  return args[index + 1] ?? fallback
}

export function parseDictionaryChars(dictionaryText: string): string[] {
  const chars = new Set<string>()

  for (const line of dictionaryText.split(/\r?\n/u)) {
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

  return Array.from(chars).sort((left, right) => left.localeCompare(right, 'zh-Hant'))
}

export function getCjkBlock(codepoint: number): string {
  if (codepoint === 0x3007) {
    return 'U+3007'
  }
  if (codepoint >= 0x3400 && codepoint <= 0x4dbf) {
    return 'ExtA'
  }
  if (codepoint >= 0x4e00 && codepoint <= 0x9fff) {
    return 'URO'
  }
  if (codepoint >= 0x20000 && codepoint <= 0x2a6df) {
    return 'ExtB'
  }
  if (codepoint >= 0x2a700 && codepoint <= 0x2b73f) {
    return 'ExtC'
  }
  if (codepoint >= 0x2b740 && codepoint <= 0x2b81f) {
    return 'ExtD'
  }
  if (codepoint >= 0x2b820 && codepoint <= 0x2ceaf) {
    return 'ExtE_F'
  }
  if (codepoint >= 0x2ceb0 && codepoint <= 0x2ebef) {
    return 'ExtF_I'
  }
  if (codepoint >= 0x30000 && codepoint <= 0x3134f) {
    return 'ExtG'
  }
  if (codepoint >= 0x31350 && codepoint <= 0x323af) {
    return 'ExtH_J'
  }
  if (codepoint >= 0xf900 && codepoint <= 0xfaff) {
    return 'Compat'
  }

  return 'Other'
}

export function buildMissingRecords(
  dictionaryChars: readonly string[],
  pronunciationChars: ReadonlySet<string>,
): MissingCharacterRecord[] {
  const missing: MissingCharacterRecord[] = []

  for (const char of dictionaryChars) {
    if (pronunciationChars.has(char)) {
      continue
    }

    const codepoint = char.codePointAt(0)
    if (codepoint === undefined) {
      continue
    }

    missing.push({
      char,
      codepoint: `U+${codepoint.toString(16).toUpperCase()}`,
      block: getCjkBlock(codepoint),
    })
  }

  return missing
}

export function summarizeCoverage(
  dictionaryChars: readonly string[],
  pronunciationChars: ReadonlySet<string>,
  missingRecords: readonly MissingCharacterRecord[],
): CoverageSummary {
  const blockCounts = new Map<string, number>()

  for (const record of missingRecords) {
    blockCounts.set(record.block, (blockCounts.get(record.block) ?? 0) + 1)
  }

  return {
    dictionaryCharCount: dictionaryChars.length,
    pronunciationEntryCount: pronunciationChars.size,
    missingCount: missingRecords.length,
    coverageRatio:
      dictionaryChars.length === 0 ? 0 : Number((pronunciationChars.size / dictionaryChars.length).toFixed(6)),
    blocks: Object.fromEntries(Array.from(blockCounts.entries()).sort((left, right) => right[1] - left[1])),
  }
}

async function maybeWriteJson(filePath: string | undefined, value: unknown): Promise<void> {
  if (!filePath) {
    return
  }

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dictionaryPath = getArg(args, '--dictionary', 'public/dict/full-dictionary.csv')
  const pronunciationPath = getArg(args, '--pronunciation', 'public/dict/pronunciation.latest.v1.json')
  const summaryOut = getArg(args, '--summary-out')
  const missingOut = getArg(args, '--missing-out')

  if (!dictionaryPath || !pronunciationPath) {
    throw new Error('dictionaryPath and pronunciationPath are required')
  }

  const dictionaryText = await readFile(dictionaryPath, 'utf8')
  const pronunciationText = await readFile(pronunciationPath, 'utf8')
  const pronunciationPayload = validatePronunciationPayload(JSON.parse(pronunciationText) as unknown)

  const dictionaryChars = parseDictionaryChars(dictionaryText)
  const pronunciationChars = new Set(Object.keys(pronunciationPayload.entries))
  const missingRecords = buildMissingRecords(dictionaryChars, pronunciationChars)
  const summary = summarizeCoverage(dictionaryChars, pronunciationChars, missingRecords)

  await maybeWriteJson(summaryOut, {
    schema: 'cj-pronunciation-coverage-audit@1',
    dictionaryPath,
    pronunciationPath,
    summary,
  })
  await maybeWriteJson(missingOut, missingRecords)

  process.stdout.write(
    `${JSON.stringify(
      {
        dictionaryPath,
        pronunciationPath,
        summary,
        sampleMissing: missingRecords.slice(0, 20),
      },
      null,
      2,
    )}\n`,
  )
}

const isDirectRun = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false

if (isDirectRun) {
  void main()
}
