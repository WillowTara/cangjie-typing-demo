import { useEffect, useMemo, useRef, useState } from 'react'
import type { DictionaryLookupFn } from '../../lib/dictionary'
import { formatKeySequence } from './zhuyinKeyboard'

type LookupSystem = 'cangjie' | 'quick' | 'pinyin' | 'zhuyin'

type VisibleSystems = Record<LookupSystem, boolean>

const LOOKUP_SYSTEM_OPTIONS: readonly LookupSystem[] = ['cangjie', 'quick', 'pinyin', 'zhuyin']

const LOOKUP_SYSTEM_LABELS: Record<LookupSystem, string> = {
  cangjie: '倉頡',
  quick: '速成',
  pinyin: '拼音',
  zhuyin: '注音',
}

const DEFAULT_VISIBLE_SYSTEMS: VisibleSystems = {
  cangjie: true,
  quick: true,
  pinyin: true,
  zhuyin: true,
}

function codeToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}

function hasAnyVisibleSystem(visibleSystems: VisibleSystems): boolean {
  return LOOKUP_SYSTEM_OPTIONS.some((system) => visibleSystems[system])
}

function rowHasVisibleContent(
  visibleSystems: VisibleSystems,
  mandarinReadingsCount: number,
): boolean {
  if (visibleSystems.cangjie || visibleSystems.quick) {
    return true
  }

  return mandarinReadingsCount > 0 && (visibleSystems.pinyin || visibleSystems.zhuyin)
}

type DictionaryLookupProps = {
  /** Abstract lookup function - the preferred way to query */
  lookup: DictionaryLookupFn
  /** @deprecated Provided for backward compatibility */
  dictionaryIndex?: never
  isLoading?: boolean
  loadError?: string
  pronunciationLoadError?: string
}

export function DictionaryLookup({
  lookup,
  isLoading,
  loadError,
  pronunciationLoadError,
}: DictionaryLookupProps) {
  const [input, setInput] = useState('')
  const [visibleSystems, setVisibleSystems] = useState<VisibleSystems>(DEFAULT_VISIBLE_SYSTEMS)
  const inputRef = useRef<HTMLInputElement>(null)
  const settleTimerRef = useRef<number | null>(null)

  const syncInputValue = (value: string) => {
    setInput(value)
  }

  const scheduleSettledInputSync = () => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
    }

    settleTimerRef.current = window.setTimeout(() => {
      const latestValue = inputRef.current?.value
      if (typeof latestValue === 'string') {
        syncInputValue(latestValue)
      }
      settleTimerRef.current = null
    }, 0)
  }

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current)
      }
    }
  }, [])

  const rows = useMemo(() => {
    if (!input.trim()) {
      return []
    }

    return Array.from(input).map((char) => {
      const entry = lookup(char)
      return {
        char,
        cangjie: entry?.cangjie ?? '-',
        quick: entry?.quick ?? '-',
        cangjieKeys: entry ? codeToEnglishKeys(entry.cangjie) : '-',
        mandarinReadings: entry?.mandarinReadings ?? [],
      }
    })
  }, [input, lookup])

  const hasVisibleSystems = hasAnyVisibleSystem(visibleSystems)

  const toggleVisibleSystem = (system: LookupSystem) => {
    setVisibleSystems((current) => ({
      ...current,
      [system]: !current[system],
    }))
  }

  return (
    <section className="dictionary-lookup">
      <div className="lookup-input-container">
        <input
          ref={inputRef}
          type="text"
          className="lookup-input"
          value={input}
          onChange={(event) => syncInputValue(event.currentTarget.value)}
          onCompositionEnd={(event) => {
            syncInputValue(event.currentTarget.value)
            scheduleSettledInputSync()
          }}
          placeholder="輸入中文字查詢倉頡/速成碼..."
          disabled={isLoading}
        />
        <span className="lookup-hint">{rows.length} 字</span>
      </div>

      <div className="lookup-filter-bar" role="toolbar" aria-label="查碼顯示系統">
        <span className="lookup-filter-label">顯示</span>
        <div className="lookup-filter-options">
          {LOOKUP_SYSTEM_OPTIONS.map((system) => (
            <button
              key={system}
              type="button"
              className={`lookup-filter-btn ${visibleSystems[system] ? 'active' : ''}`}
              aria-pressed={visibleSystems[system]}
              onClick={() => toggleVisibleSystem(system)}
            >
              {LOOKUP_SYSTEM_LABELS[system]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="lookup-message">載入字典中...</p>}
      {loadError && <p className="lookup-message error">{loadError}</p>}
      {pronunciationLoadError ? (
        <p className="lookup-message">讀音資料暫時不可用，查碼功能仍可正常使用。</p>
      ) : null}

      {!hasVisibleSystems ? <p className="lookup-message">請至少選擇一種顯示系統。</p> : null}

      {rows.length > 0 && hasVisibleSystems ? (
        <div className="lookup-results">
          {rows.map((row, index) => (
            <article key={`${index}-${row.char}`} className="lookup-item">
              <span className="lookup-char">{row.char}</span>
              <div className="lookup-codes">
                {visibleSystems.cangjie ? (
                  <div className="code-row">
                    <span className="code-label">倉頡</span>
                    <span className="code-value">{row.cangjie}</span>
                    <span className="code-english">{row.cangjieKeys}</span>
                  </div>
                ) : null}

                {visibleSystems.quick ? (
                  <div className="code-row">
                    <span className="code-label">速成</span>
                    <span className="code-value">{row.quick}</span>
                  </div>
                ) : null}

                {visibleSystems.pinyin && row.mandarinReadings.length > 0 ? (
                  <div className="code-row pronunciation-row">
                    <span className="code-label">拼音</span>
                    <div className="reading-list" aria-label={`${row.char} 普通話拼音`}>
                      {row.mandarinReadings.map((reading) => (
                        <span key={`${row.char}-${reading.id}-pinyin`} className="reading-chip">
                          <span className="reading-main">{reading.pinyinDisplay}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleSystems.zhuyin && row.mandarinReadings.length > 0 ? (
                  <div className="code-row pronunciation-row">
                    <span className="code-label">注音</span>
                    <div className="reading-list" aria-label={`${row.char} 台灣注音`}>
                      {row.mandarinReadings.map((reading) => (
                        <span key={`${row.char}-${reading.id}-zhuyin`} className="reading-chip reading-chip-zhuyin">
                          <span className="reading-main">{reading.zhuyinDisplay}</span>
                          <span className="reading-keys">{formatKeySequence(reading.zhuyinKeySequence)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!rowHasVisibleContent(visibleSystems, row.mandarinReadings.length) ? (
                  <div className="code-row code-row-empty">
                    <span className="code-label">狀態</span>
                    <span className="code-empty">所選系統暫無資料</span>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
