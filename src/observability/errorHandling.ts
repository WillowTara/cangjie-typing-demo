import { logger } from './logger'

export type TeardownGlobalErrorHandling = () => void

export function setupGlobalErrorHandling(): TeardownGlobalErrorHandling {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const onError = (event: ErrorEvent) => {
    logger.error('Unhandled runtime error', {
      context: 'window.error',
      error: event.error ?? event.message,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    logger.error('Unhandled promise rejection', {
      context: 'window.unhandledrejection',
      error: event.reason,
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}
