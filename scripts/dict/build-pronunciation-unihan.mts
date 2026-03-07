#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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

function getArg(args: string[], name: string, fallback: string): string {
  const index = args.findIndex((value) => value === name)
  return index < 0 ? fallback : (args[index + 1] ?? fallback)
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
  const defaultSources = input.replace(/\.[^./\\]+$/u, '.sources.json')
  const sourcesPath = getArg(args, '--sources', defaultSources)

  const sourceText = await readFile(input, 'utf8')
  const sourceSha256 = createHash('sha256').update(sourceText).digest('hex')
  const rows = JSON.parse(sourceText) as InputRow[]
  if (!Array.isArray(rows)) {
    throw new Error('Pronunciation input must be a JSON array')
  }

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
  const artifactText = `${JSON.stringify({
    ...preliminaryPayload,
    artifact: {
      file: artifactFile,
      sha256: createHash('sha256').update(preliminaryText).digest('hex'),
      bytes: Buffer.byteLength(preliminaryText),
    },
  }, null, 2)}\n`
  const artifactSha256 = createHash('sha256').update(artifactText).digest('hex')
  const artifactBytes = Buffer.byteLength(artifactText)
  const metaFile = `pronunciation.${dictVersion}.${shortHash}.meta.json`
  const licensesFile = `pronunciation.${dictVersion}.${shortHash}.licenses.json`

  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, artifactFile), artifactText, 'utf8')
  await writeFile(join(outputDir, 'pronunciation.latest.v1.json'), artifactText, 'utf8')
  await writeFile(join(outputDir, metaFile), `${JSON.stringify({
    schema: 'cj-pronunciation-meta@1',
    dictVersion,
    artifact: { file: artifactFile, sha256: artifactSha256, bytes: artifactBytes },
    stats: {
      entryCount: Object.keys(entries).length,
      readingCount: Object.values(entries).reduce((sum, entry) => sum + entry.mandarinReadings.length, 0),
    },
    sources,
    build: {
      toolVersion: 'pronunciation-build/0.1.0',
      generatedAt: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT ?? 'unknown',
    },
  }, null, 2)}\n`, 'utf8')
  await writeFile(
    join(outputDir, licensesFile),
    `${JSON.stringify({ schema: 'cj-pronunciation-licenses@1', sources }, null, 2)}\n`,
    'utf8',
  )

  process.stdout.write(`built ${artifactFile} (${Object.keys(entries).length} chars)\n`)
}

void main()
