#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'

type InputRow = {
  char: string
  cangjie: string
  quick?: string
}

function deriveQuick(cangjie: string): string {
  return cangjie.length <= 2 ? cangjie : `${cangjie[0]}${cangjie[cangjie.length - 1]}`
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

  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].split(',').map((item) => item.trim())
    if (index === 0 && parts[0]?.toLowerCase() === 'char') {
      continue
    }

    if (parts.length >= 2) {
      rows.push({
        char: parts[0],
        cangjie: parts[1],
        quick: parts[2],
      })
    }
  }

  return rows
}

function normalizeRows(rows: InputRow[]) {
  const map = new Map<string, { char: string; cangjie: string; quick: string }>()

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

    const maybeQuick = String(row.quick ?? '').trim().toUpperCase()
    const quick = /^[A-Z]{1,5}$/u.test(maybeQuick) ? maybeQuick : deriveQuick(cangjie)
    map.set(char, { char, cangjie, quick })
  }

  return Array.from(map.values())
}

async function runPythonCreateSqlite(jsonPath: string, sqlitePath: string): Promise<void> {
  const py = [
    'import json, sqlite3, sys',
    'rows_path, db_path = sys.argv[1], sys.argv[2]',
    'rows = json.load(open(rows_path, "r", encoding="utf-8"))',
    'conn = sqlite3.connect(db_path)',
    'cur = conn.cursor()',
    'cur.execute("DROP TABLE IF EXISTS dictionary")',
    'cur.execute("CREATE TABLE dictionary (char TEXT PRIMARY KEY, cangjie TEXT NOT NULL, quick TEXT NOT NULL)")',
    'cur.execute("CREATE INDEX IF NOT EXISTS idx_dictionary_cangjie ON dictionary(cangjie)")',
    'cur.execute("CREATE INDEX IF NOT EXISTS idx_dictionary_quick ON dictionary(quick)")',
    'cur.executemany("INSERT INTO dictionary(char, cangjie, quick) VALUES (?, ?, ?)", [(r["char"], r["cangjie"], r["quick"]) for r in rows])',
    'conn.commit()',
    'conn.close()',
  ].join(';')

  await new Promise<void>((resolve, reject) => {
    const child = spawn('python', ['-c', py, jsonPath, sqlitePath], { stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`python sqlite export failed with code ${String(code)}`))
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string, fallback: string) => {
    const index = args.findIndex((value) => value === name)
    if (index < 0) {
      return fallback
    }
    return args[index + 1] ?? fallback
  }

  const input = getArg('--input', 'public/dict/sample-dictionary.json')
  const output = getArg('--output', 'public/dict/dict.sqlite')

  const sourceText = await readFile(input, 'utf8')
  const rows = normalizeRows(parseRows(sourceText, input))

  if (rows.length === 0) {
    throw new Error('No valid rows to export sqlite')
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'dict-sqlite-'))
  const tempJsonPath = join(tempDir, 'rows.json')

  try {
    await writeFile(tempJsonPath, JSON.stringify(rows), 'utf8')
    await runPythonCreateSqlite(tempJsonPath, output)
    process.stdout.write(`exported sqlite: ${output} (${rows.length} rows)\n`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

void main()
