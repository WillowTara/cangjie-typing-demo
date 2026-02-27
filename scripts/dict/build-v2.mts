#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toUnicodeLabel } from './schema.ts'

const MAGIC = 'CJDICTV2'
const HEADER_SIZE = 64
const SLOT_SIZE = 6

type InputRow = {
  char: string
  cangjie: string
  quick?: string
}

function deriveQuick(cangjie) {
  return cangjie.length <= 2 ? cangjie : `${cangjie[0]}${cangjie[cangjie.length - 1]}`
}

function codeToSlot(code) {
  const out = Buffer.alloc(SLOT_SIZE, 255)
  out[0] = code.length
  for (let i = 0; i < code.length; i += 1) {
    out[i + 1] = code.charCodeAt(i) - 65
  }
  return out
}

function parseRows(inputText: string, inputFile: string): InputRow[] {
  if (inputFile.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(inputText) as unknown
    if (Array.isArray(parsed)) {
      return parsed as InputRow[]
    }
    return Object.entries(parsed as Record<string, unknown>).map(([char, value]) => {
      const record = value as Record<string, unknown>
      return {
      char,
      cangjie: String(record.cangjie ?? ''),
      quick: String(record.quick ?? ''),
    }
    })
  }

  const lines = inputText.trim().split(/\r?\n/u)
  const rows: InputRow[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const parts = lines[i].split(',').map((item) => item.trim())
    if (i === 0 && parts[0]?.toLowerCase() === 'char') {
      continue
    }
    if (parts.length >= 2) {
      rows.push({ char: parts[0], cangjie: parts[1], quick: parts[2] })
    }
  }
  return rows
}

function normalizeEntries(rows: InputRow[]) {
  const byCodepoint = new Map<number, { char: string; cangjie: string; quick: string; codepoint: number }>()

  for (const row of rows) {
    const chars = Array.from(String(row.char ?? '').trim())
    if (chars.length !== 1) {
      continue
    }
    const char = chars[0]
    const cangjie = String(row.cangjie ?? '').trim().toUpperCase()
    if (!/^[A-Z]{1,5}$/u.test(cangjie)) {
      continue
    }
    const rawQuick = String(row.quick ?? '').trim().toUpperCase()
    const quick = /^[A-Z]{1,5}$/u.test(rawQuick) ? rawQuick : deriveQuick(cangjie)
    const codepoint = char.codePointAt(0)
    if (codepoint === undefined) {
      continue
    }
    byCodepoint.set(codepoint, { char, cangjie, quick, codepoint })
  }

  return Array.from(byCodepoint.values()).sort((a, b) => a.codepoint - b.codepoint)
}

function buildBinary(entries: Array<{ char: string; cangjie: string; quick: string; codepoint: number }>) {
  const hasQuickTable = entries.some((entry) => entry.quick !== deriveQuick(entry.cangjie))
  const codepointsBytes = entries.length * 4
  const cangjieBytes = entries.length * SLOT_SIZE
  const quickBytes = hasQuickTable ? entries.length * SLOT_SIZE : 0
  const payloadBytes = codepointsBytes + cangjieBytes + quickBytes
  const totalBytes = HEADER_SIZE + payloadBytes
  const out = Buffer.alloc(totalBytes)

  out.write(MAGIC, 0, 'ascii')
  out.writeUInt16LE(2, 8)
  out.writeUInt16LE(0, 10)

  const flags = hasQuickTable ? 1 : 4
  const codepointsOffset = HEADER_SIZE
  const cangjieOffset = codepointsOffset + codepointsBytes
  const quickOffset = hasQuickTable ? cangjieOffset + cangjieBytes : 0

  out.writeUInt32LE(flags, 12)
  out.writeUInt32LE(entries.length, 16)
  out.writeUInt32LE(HEADER_SIZE, 20)
  out.writeUInt32LE(codepointsOffset, 24)
  out.writeUInt32LE(cangjieOffset, 28)
  out.writeUInt32LE(quickOffset, 32)
  out.writeUInt32LE(0, 36)
  out.writeUInt32LE(payloadBytes, 40)

  for (let i = 0; i < entries.length; i += 1) {
    out.writeUInt32LE(entries[i].codepoint, codepointsOffset + i * 4)
    codeToSlot(entries[i].cangjie).copy(out, cangjieOffset + i * SLOT_SIZE)
    if (hasQuickTable) {
      codeToSlot(entries[i].quick).copy(out, quickOffset + i * SLOT_SIZE)
    }
  }

  return { out, hasQuickTable }
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name, fallback) => {
    const index = args.findIndex((value) => value === name)
    if (index < 0) {
      return fallback
    }
    return args[index + 1] ?? fallback
  }

  const input = getArg('--input', 'public/dict/sample-dictionary.json')
  const variant = getArg('--variant', 'core')
  const dictVersion = getArg('--version', '2026.03.0')
  const outputDir = getArg('--out-dir', 'public/dict')

  const sourceText = await readFile(input, 'utf8')
  const rows = parseRows(sourceText, input)
  const entries = normalizeEntries(rows)

  if (entries.length === 0) {
    throw new Error('No valid entries after normalization')
  }

  const { out, hasQuickTable } = buildBinary(entries)
  const sha256 = createHash('sha256').update(out).digest('hex')
  const shortHash = sha256.slice(0, 8)

  const base = `${variant}.${dictVersion}.${shortHash}`
  const binName = `${base}.v2.bin`
  const metaName = `${base}.meta.json`
  const licensesName = `${base}.licenses.json`

  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, binName), out)

  const minCodepoint = entries[0].codepoint
  const maxCodepoint = entries[entries.length - 1].codepoint
  const includesNonBmpHan = entries.some((entry) => entry.codepoint > 0xffff)

  const meta = {
    schema: 'cj-dict-meta@2',
    dictVersion,
    variant,
    artifact: {
      file: binName,
      sha256,
      bytes: out.byteLength,
    },
    format: {
      versionMajor: 2,
      versionMinor: 0,
      flags: {
        hasQuickTable,
        hasFrequency: false,
        quickDerivedDefault: !hasQuickTable,
      },
    },
    stats: {
      entryCount: entries.length,
      duplicateOverrides: rows.length - entries.length,
      rejectedRows: 0,
    },
    unicode: {
      minCodepoint: toUnicodeLabel(minCodepoint),
      maxCodepoint: toUnicodeLabel(maxCodepoint),
      includesNonBmpHan,
    },
    sources: [
      {
        id: 'input',
        name: input,
        license: 'UNSPECIFIED',
        version: 'local',
        sha256: createHash('sha256').update(sourceText).digest('hex'),
      },
    ],
    build: {
      toolVersion: 'dict-build/0.1.0',
      generatedAt: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT ?? 'unknown',
    },
    compat: {
      minRuntimeSchema: 2,
      fallbackFormat: 'v1-json-csv',
    },
  }

  await writeFile(join(outputDir, metaName), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
  await writeFile(
    join(outputDir, licensesName),
    `${JSON.stringify({ schema: 'cj-dict-licenses@1', sources: meta.sources }, null, 2)}\n`,
    'utf8',
  )

  const cwd = dirname(fileURLToPath(import.meta.url))
  process.stdout.write(`built ${binName} (${entries.length} entries) via ${cwd}\n`)
}

void main()
