import { useEffect, useState } from 'react'
import {
  buildPronunciationIndex,
  createPronunciationLookup,
  validatePronunciationPayload,
  type PronunciationLookupFn,
} from '../../lib/pronunciation'
import { logger } from '../../observability/logger'

const PRONUNCIATION_URL = '/dict/pronunciation.latest.v1.json'
const EMPTY_LOOKUP: PronunciationLookupFn = () => undefined

type UsePronunciationDictionaryOptions = {
  enabled: boolean
}

export type PronunciationDictionaryState = {
  lookupPronunciation: PronunciationLookupFn
  isLoading: boolean
  loadError?: string
}

let cachedLookup: PronunciationLookupFn | undefined

export function resetPronunciationDictionaryCacheForTests(): void {
  cachedLookup = undefined
}

export function usePronunciationDictionary(
  options: UsePronunciationDictionaryOptions,
): PronunciationDictionaryState {
  const [lookupPronunciation, setLookupPronunciation] = useState<PronunciationLookupFn>(() =>
    cachedLookup ?? EMPTY_LOOKUP,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!options.enabled) {
      setIsLoading(false)
      setLoadError(null)
      setLookupPronunciation(() => cachedLookup ?? EMPTY_LOOKUP)
      return
    }

    if (cachedLookup) {
      setLookupPronunciation(() => cachedLookup ?? EMPTY_LOOKUP)
      setIsLoading(false)
      setLoadError(null)
      return
    }

    let isActive = true

    const fetchPronunciationDictionary = async () => {
      const loadStart = performance.now()
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(PRONUNCIATION_URL)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const payload = validatePronunciationPayload(await response.json())
        const index = buildPronunciationIndex(payload)
        const nextLookup = createPronunciationLookup(index)

        cachedLookup = nextLookup
        if (!isActive) {
          return
        }

        setLookupPronunciation(() => nextLookup)
        logger.info('Pronunciation dictionary loaded', {
          context: 'usePronunciationDictionary',
          metadata: {
            pronunciationUrl: PRONUNCIATION_URL,
            entryCount: index.size,
            totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
          },
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'Failed to load pronunciation dictionary'
        setLoadError(message)
        setLookupPronunciation(() => EMPTY_LOOKUP)
        logger.warn('Pronunciation dictionary load failed', {
          context: 'usePronunciationDictionary',
          error,
          metadata: {
            pronunciationUrl: PRONUNCIATION_URL,
            totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
          },
        })
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void fetchPronunciationDictionary()

    return () => {
      isActive = false
    }
  }, [options.enabled])

  return {
    lookupPronunciation,
    isLoading,
    loadError: loadError ?? undefined,
  }
}
