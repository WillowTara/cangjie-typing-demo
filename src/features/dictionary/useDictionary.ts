import { useEffect, useState } from 'react'
import { getDictionaryCandidateUrls, getRuntimeConfig } from '../../config/runtime'
import {
  buildDictionaryIndex,
  parseDictionaryTextWithReport,
  type DictionaryIndex,
  type DictionaryLookupFn,
} from '../../lib/dictionary'
import { createBinaryLookup, decodeDictionaryBinary } from '../../lib/dictionaryBinary'
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

function isBinaryDictionaryUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.bin')
}

function fallbackLookup(char: string) {
  return FALLBACK_INDEX.map.get(char)
}

export function useDictionary(): DictionaryState {
  const [dictionaryIndex, setDictionaryIndex] = useState<DictionaryIndex>(FALLBACK_INDEX)
  const [lookup, setLookup] = useState<DictionaryLookupFn>(() => fallbackLookup)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const runtimeConfig = getRuntimeConfig()
    const candidateUrls = getDictionaryCandidateUrls(runtimeConfig)

    const fetchDictionary = async () => {
      const loadStart = performance.now()
      let lastError: unknown = null
      let loaded = false

      setIsLoading(true)
      setLoadError(null)

      for (let attempt = 0; attempt < candidateUrls.length; attempt += 1) {
        const dictionaryUrl = candidateUrls[attempt]

        try {
          const response = await fetch(dictionaryUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          if (isBinaryDictionaryUrl(dictionaryUrl)) {
            const bytes = new Uint8Array(await response.arrayBuffer())
            const decodeStart = performance.now()
            const binary = decodeDictionaryBinary(bytes)
            const binaryLookup = createBinaryLookup(binary)

            if (!isActive) {
              return
            }

            setDictionaryIndex({ map: new Map(), size: binary.header.entryCount })
            setLookup(() => binaryLookup)

            logger.info('Dictionary loaded from v2 binary', {
              context: 'useDictionary',
              metadata: {
                dictionaryUrl,
                entryCount: binary.header.entryCount,
                decodeMs: Number((performance.now() - decodeStart).toFixed(2)),
                totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
                attempt: attempt + 1,
                totalCandidates: candidateUrls.length,
              },
            })

            loaded = true
            break
          }

          const text = await response.text()
          const parseStart = performance.now()
          const { entries, report } = parseDictionaryTextWithReport(dictionaryUrl, text)

          if (report.acceptedRows === 0) {
            throw new Error('No valid dictionary entries found')
          }

          if (!isActive) {
            return
          }

          const nextIndex = buildDictionaryIndex(entries)
          setDictionaryIndex(nextIndex)
          setLookup(() => (char: string) => nextIndex.map.get(char))

          logger.info('Dictionary loaded from text source', {
            context: 'useDictionary',
            metadata: {
              dictionaryUrl,
              acceptedRows: report.acceptedRows,
              parseMs: Number((performance.now() - parseStart).toFixed(2)),
              totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
              attempt: attempt + 1,
              totalCandidates: candidateUrls.length,
            },
          })

          loaded = true
          break
        } catch (error) {
          lastError = error

          if (!isActive) {
            return
          }

          logger.warn('Dictionary load attempt failed', {
            context: 'useDictionary',
            error,
            metadata: {
              dictionaryUrl,
              attempt: attempt + 1,
              totalCandidates: candidateUrls.length,
              totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
            },
          })
        }
      }

      if (!loaded && isActive) {
        const message =
          lastError instanceof Error ? lastError.message : 'Failed to load dictionary sources'
        logger.warn('Dictionary load failed, fallback dictionary enabled', {
          context: 'useDictionary',
          error: lastError,
          metadata: {
            dictionaryUrl: runtimeConfig.dictionaryUrl,
            candidateUrls,
            totalLoadMs: Number((performance.now() - loadStart).toFixed(2)),
          },
        })
        setLoadError(message)
        setDictionaryIndex(FALLBACK_INDEX)
        setLookup(() => fallbackLookup)
      }

      if (isActive) {
        setIsLoading(false)
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
