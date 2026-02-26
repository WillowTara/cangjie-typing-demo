import { useCallback, useEffect, useState } from 'react'
import { getRuntimeConfig } from '../../config/runtime'
import {
  buildDictionaryIndex,
  parseDictionaryTextWithReport,
  type DictionaryIndex,
  type DictionaryLookupFn,
} from '../../lib/dictionary'
import { logger } from '../../observability/logger'
import { FALLBACK_INDEX } from './fallbackDictionary'

export type DictionaryState = {
  /** @deprecated Use lookup() instead - exposes raw index for backward compatibility */
  dictionaryIndex: DictionaryIndex
  /** Abstract lookup function - preferred way to query dictionary */
  lookup: DictionaryLookupFn
  isLoading: boolean
  loadError?: string
}

export function useDictionary(): DictionaryState {
  const [dictionaryIndex, setDictionaryIndex] = useState<DictionaryIndex>(FALLBACK_INDEX)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Create lookup function from current index - this abstracts the Map.get away
  const lookup = useCallback<DictionaryLookupFn>((char: string) => {
    const entry = dictionaryIndex.map.get(char)
    if (!entry) {
      return undefined
    }
    return {
      cangjie: entry.cangjie,
      quick: entry.quick,
    }
  }, [dictionaryIndex])

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
    lookup,
    isLoading,
    loadError: loadError ?? undefined,
  }
}
