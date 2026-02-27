const DEFAULT_DICTIONARY_URL = '/dict/sample-dictionary.json'
const DEFAULT_LOG_LEVEL = 'info' as const
const DEFAULT_DICTIONARY_VARIANT = 'core' as const

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
const DICTIONARY_VARIANTS = ['core', 'full'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]
export type DictionaryVariant = (typeof DICTIONARY_VARIANTS)[number]

export type RuntimeConfig = {
  dictionaryUrl: string
  logLevel: LogLevel
  dictionaryVariant: DictionaryVariant
}

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

export function getRuntimeConfig(): RuntimeConfig {
  const dictionaryUrl =
    normalizeOptionalValue(import.meta.env.VITE_DICTIONARY_URL) ?? DEFAULT_DICTIONARY_URL
  const logLevel = normalizeLogLevel(import.meta.env.VITE_LOG_LEVEL)
  const dictionaryVariant = normalizeDictionaryVariant(import.meta.env.VITE_DICTIONARY_VARIANT)

  return {
    dictionaryUrl,
    logLevel,
    dictionaryVariant,
  }
}
