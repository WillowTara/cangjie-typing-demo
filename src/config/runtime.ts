const DEFAULT_DICTIONARY_URL = '/dict/sample-dictionary.json'
const DEFAULT_LOG_LEVEL = 'info' as const

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export type RuntimeConfig = {
  dictionaryUrl: string
  logLevel: LogLevel
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

export function getRuntimeConfig(): RuntimeConfig {
  const dictionaryUrl =
    normalizeOptionalValue(import.meta.env.VITE_DICTIONARY_URL) ?? DEFAULT_DICTIONARY_URL
  const logLevel = normalizeLogLevel(import.meta.env.VITE_LOG_LEVEL)

  return {
    dictionaryUrl,
    logLevel,
  }
}
