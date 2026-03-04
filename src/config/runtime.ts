const LEGACY_SAMPLE_DICTIONARY_URL = '/dict/sample-dictionary.json'
const DEFAULT_LOG_LEVEL = 'info' as const
const DEFAULT_DICTIONARY_VARIANT = 'core' as const

const DEFAULT_DICTIONARY_URL_BY_VARIANT = {
  core: '/dict/core.latest.v2.bin',
  full: '/dict/full.latest.v2.bin',
} as const

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
const DICTIONARY_VARIANTS = ['core', 'full'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]
export type DictionaryVariant = (typeof DICTIONARY_VARIANTS)[number]

export type RuntimeConfig = {
  dictionaryUrl: string
  logLevel: LogLevel
  dictionaryVariant: DictionaryVariant
}

export type RuntimeDictionaryConfig = Pick<RuntimeConfig, 'dictionaryUrl' | 'dictionaryVariant'>

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function normalizeLogLevel(value: string | undefined): LogLevel {
  const normalized = normalizeOptionalValue(value)?.toLowerCase()

  for (const level of LOG_LEVELS) {
    if (normalized === level) {
      return level
    }
  }

  return DEFAULT_LOG_LEVEL
}

function normalizeDictionaryVariant(value: string | undefined): DictionaryVariant {
  const normalized = normalizeOptionalValue(value)?.toLowerCase()

  for (const variant of DICTIONARY_VARIANTS) {
    if (normalized === variant) {
      return variant
    }
  }

  return DEFAULT_DICTIONARY_VARIANT
}

function getDefaultDictionaryUrl(variant: DictionaryVariant): string {
  return DEFAULT_DICTIONARY_URL_BY_VARIANT[variant]
}

export function getDictionaryCandidateUrls(config: RuntimeDictionaryConfig): string[] {
  const candidates = [
    config.dictionaryUrl,
    getDefaultDictionaryUrl(config.dictionaryVariant),
    LEGACY_SAMPLE_DICTIONARY_URL,
  ]

  const unique: string[] = []
  for (const candidate of candidates) {
    const normalized = normalizeOptionalValue(candidate)
    if (!normalized || unique.includes(normalized)) {
      continue
    }

    unique.push(normalized)
  }

  return unique
}

export function getRuntimeConfig(): RuntimeConfig {
  const dictionaryVariant = normalizeDictionaryVariant(import.meta.env.VITE_DICTIONARY_VARIANT)
  const dictionaryUrl =
    normalizeOptionalValue(import.meta.env.VITE_DICTIONARY_URL) ??
    getDefaultDictionaryUrl(dictionaryVariant)
  const logLevel = normalizeLogLevel(import.meta.env.VITE_LOG_LEVEL)

  return {
    dictionaryUrl,
    logLevel,
    dictionaryVariant,
  }
}
