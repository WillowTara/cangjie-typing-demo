import { useEffect, useState } from 'react'
import { getRuntimeConfig } from '../../config/runtime'
import { buildDictionaryIndex, parseDictionaryTextWithReport, type DictionaryIndex } from '../../lib/dictionary'
import { logger } from '../../observability/logger'
import { FALLBACK_INDEX } from './fallbackDictionary'

export type DictionaryState = {
  dictionaryIndex: DictionaryIndex
  isLoading: boolean
  loadError?: string
}

export function useDictionary(): DictionaryState {
  const [dictionaryIndex, setDictionaryIndex] = useState<DictionaryIndex>(FALLBACK_INDEX)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const { dictionaryUrl } = getRuntimeConfig()

    const fetchDictionary = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        const response = await fetch(dictionaryUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const text = await response.text()
        const { entries, report } = parseDictionaryTextWithReport(dictionaryUrl, text)

        if (report.acceptedRows === 0) {
          throw new Error('No valid dictionary entries found')
        }

        if (!isActive) {
          return
        }

        setDictionaryIndex(buildDictionaryIndex(entries))
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : 'Failed to load dictionary'
        logger.warn('Dictionary load failed, fallback dictionary enabled', {
          context: 'useDictionary',
          error,
          metadata: {
            dictionaryUrl,
          },
        })
        setLoadError(message)
        setDictionaryIndex(FALLBACK_INDEX)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void fetchDictionary()

    return () => {
      isActive = false
    }
  }, [])

  return {
    dictionaryIndex,
    isLoading,
    loadError: loadError ?? undefined,
  }
}
