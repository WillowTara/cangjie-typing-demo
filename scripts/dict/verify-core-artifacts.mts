#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const CODE_PATTERN = /^[A-Z]{1,5}$/u

type InputRow = {
  char: string
  cangjie: string
  quick?: string
}

type NormalizedEntry = {
  char: string
  cangjie: string
  quick: string
  codepoint: number
}

function getArg(args: string[], name: string, fallback: string): string {
  const index = args.findIndex((value) => value === name)
  if (index < 0) {
    return fallback
  }

  return args[index + 1] ?? fallback
}

function deriveQuick(cangjie: string): string {
  return cangjie.length <= 2 ? cangjie : `${cangjie[0]}${cangjie[cangjie.length - 1]}`
}

function parseCsvRows(csvText: string): InputRow[] {
  const lines = csvText.trim().split(/\r?\n/u)
  const rows: InputRow[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index]?.split(',').map((item) => item.trim()) ?? []
    if (index === 0 && parts[0]?.toLowerCase() === 'char') {
      continue
    }

    if (parts.length >= 2) {
      rows.push({
        char: parts[0] ?? '',
        cangjie: parts[1] ?? '',
        quick: parts[2] ?? '',
      })
    }
  }

  return rows
}

function normalizeEntries(rows: InputRow[]): NormalizedEntry[] {
  const byCodepoint = new Map<number, NormalizedEntry>()

  for (const row of rows) {
    const chars = Array.from(String(row.char ?? '').trim())
    if (chars.length !== 1) {
      continue
    }

    const char = chars[0]
    const cangjie = String(row.cangjie ?? '').trim().toUpperCase()
    if (!CODE_PATTERN.test(cangjie)) {
      continue
    }

    const rawQuick = String(row.quick ?? '').trim().toUpperCase()
    const quick = CODE_PATTERN.test(rawQuick) ? rawQuick : deriveQuick(cangjie)

    const codepoint = char.codePointAt(0)
    if (codepoint === undefined) {
      continue
    }

    byCodepoint.set(codepoint, {
      char,
      cangjie,
      quick,
      codepoint,
    })
  }

  return Array.from(byCodepoint.values()).sort((left, right) => left.codepoint - right.codepoint)
}

function sha256Hex(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function findMetaFile(files: string[], version: string): string {
  const prefix = `core.${version}.`
  const candidates = files
    .filter((name) => name.startsWith(prefix) && name.endsWith('.meta.json'))
    .sort()

  if (candidates.length === 0) {
    throw new Error(`No core meta file found for version ${version}`)
  }

  const latest = candidates[candidates.length - 1]
  if (!latest) {
    throw new Error(`No core meta file resolved for version ${version}`)
  }

  return latest
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const input = getArg(args, '--input', 'public/dict/core-dictionary.csv')
  const dictDir = getArg(args, '--dict-dir', 'public/dict')
  const version = getArg(args, '--version', '2026.03.0')

  const sourceText = await readFile(input, 'utf8')
  const rows = parseCsvRows(sourceText)
  const entries = normalizeEntries(rows)

  const files = await readdir(dictDir)
  const metaFile = findMetaFile(files, version)
  const metaPath = join(dictDir, metaFile)

  const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
    schema: string
    variant: string
    dictVersion: string
    artifact: { file: string; sha256: string; bytes: number }
    stats: { entryCount: number; duplicateOverrides: number }
    unicode: { includesNonBmpHan: boolean }
  }

  if (meta.schema !== 'cj-dict-meta@2') {
    throw new Error(`Unexpected meta schema: ${meta.schema}`)
  }
  if (meta.variant !== 'core') {
    throw new Error(`Unexpected variant: ${meta.variant}`)
  }
  if (meta.dictVersion !== version) {
    throw new Error(`Meta dictVersion mismatch: ${meta.dictVersion} !== ${version}`)
  }

  const artifactPath = join(dictDir, meta.artifact.file)
  const artifactBytes = await readFile(artifactPath)
  const artifactSha256 = sha256Hex(artifactBytes)
  if (artifactSha256 !== meta.artifact.sha256) {
    throw new Error('Artifact SHA-256 mismatch between binary and meta')
  }
  if (artifactBytes.byteLength !== meta.artifact.bytes) {
    throw new Error('Artifact byte size mismatch between binary and meta')
  }

  const shortHash = meta.artifact.sha256.slice(0, 8)
  if (!meta.artifact.file.includes(`.${shortHash}.`)) {
    throw new Error('Artifact filename missing expected hash prefix')
  }

  const base = meta.artifact.file.replace(/\.v2\.bin$/u, '')
  const licensesPath = join(dictDir, `${base}.licenses.json`)
  const licenses = JSON.parse(await readFile(licensesPath, 'utf8')) as {
    schema: string
    sources: Array<{ sha256: string }>
  }

  if (licenses.schema !== 'cj-dict-licenses@1') {
    throw new Error(`Unexpected licenses schema: ${licenses.schema}`)
  }
  if (!Array.isArray(licenses.sources) || licenses.sources.length === 0) {
    throw new Error('licenses.sources must be non-empty')
  }

  const sourceSha = sha256Hex(sourceText)
  if (licenses.sources[0]?.sha256 !== sourceSha) {
    throw new Error('Source SHA-256 mismatch between CSV and licenses manifest')
  }

  if (meta.stats.entryCount !== entries.length) {
    throw new Error(`Entry count mismatch: meta=${meta.stats.entryCount}, normalized=${entries.length}`)
  }

  const duplicateOverrides = rows.length - entries.length
  if (meta.stats.duplicateOverrides !== duplicateOverrides) {
    throw new Error(
      `Duplicate override mismatch: meta=${meta.stats.duplicateOverrides}, normalized=${duplicateOverrides}`,
    )
  }

  const includesNonBmpHan = entries.some((entry) => entry.codepoint > 0xffff)
  if (meta.unicode.includesNonBmpHan !== includesNonBmpHan) {
    throw new Error('includesNonBmpHan mismatch between meta and normalized entries')
  }

  process.stdout.write(
    `verified core artifacts: ${meta.artifact.file} (${entries.length} entries, hash=${shortHash})\n`,
  )
}

void main()
