import { getRuntimeConfig, type LogLevel } from '../config/runtime'

type LoggerMetadata = Record<string, unknown>

type LoggerPayload = {
  context?: string
  metadata?: LoggerMetadata
  error?: unknown
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
}

function normalizeError(error: unknown): LoggerMetadata {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  if (typeof error === 'object' && error !== null) {
    return { error }
  }

  return {}
}

function shouldLog(level: LogLevel): boolean {
  const { logLevel } = getRuntimeConfig()
  return LEVEL_RANK[level] >= LEVEL_RANK[logLevel]
}

function emit(level: LogLevel, message: string, payload: LoggerPayload = {}): void {
  if (!shouldLog(level)) {
    return
  }

  const metadata: LoggerMetadata = {
    ...(payload.metadata ?? {}),
    ...(payload.context ? { context: payload.context } : {}),
    ...normalizeError(payload.error),
  }

  const consoleMethod = CONSOLE_METHOD[level]
  const prefix = `[app:${level}]`

  if (Object.keys(metadata).length === 0) {
    console[consoleMethod](`${prefix} ${message}`)
    return
  }

  console[consoleMethod](`${prefix} ${message}`, metadata)
}

export const logger = {
  debug: (message: string, payload?: LoggerPayload) => emit('debug', message, payload),
  info: (message: string, payload?: LoggerPayload) => emit('info', message, payload),
  warn: (message: string, payload?: LoggerPayload) => emit('warn', message, payload),
  error: (message: string, payload?: LoggerPayload) => emit('error', message, payload),
}
