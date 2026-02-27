export type DictVariant = 'core' | 'full'

export type DictMetaSource = {
  id: string
  name: string
  license: string
  version: string
  sha256: string
}

export type DictMeta = {
  schema: 'cj-dict-meta@2'
  dictVersion: string
  variant: DictVariant
  artifact: {
    file: string
    sha256: string
    bytes: number
  }
  format: {
    versionMajor: 2
    versionMinor: 0
    flags: {
      hasQuickTable: boolean
      hasFrequency: boolean
      quickDerivedDefault: boolean
    }
  }
  stats: {
    entryCount: number
    duplicateOverrides: number
    rejectedRows: number
  }
  unicode: {
    minCodepoint: string
    maxCodepoint: string
    includesNonBmpHan: boolean
  }
  sources: DictMetaSource[]
  build: {
    toolVersion: string
    generatedAt: string
    gitCommit: string
  }
  compat: {
    minRuntimeSchema: 2
    fallbackFormat: 'v1-json-csv'
  }
}

export function toUnicodeLabel(codepoint: number): string {
  return `U+${codepoint.toString(16).toUpperCase()}`
}
