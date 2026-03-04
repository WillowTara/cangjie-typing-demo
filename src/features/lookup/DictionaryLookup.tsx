import { useMemo, useState } from 'react'
import type { DictionaryLookupFn } from '../../lib/dictionary'

function codeToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}

type DictionaryLookupProps = {
  /** Abstract lookup function - the preferred way to query */
  lookup: DictionaryLookupFn
  /** @deprecated Provided for backward compatibility */
  dictionaryIndex?: never
  isLoading?: boolean
  loadError?: string
}

export function DictionaryLookup({ lookup, isLoading, loadError }: DictionaryLookupProps) {
  const [input, setInput] = useState('')

  const syncInputValue = (value: string) => {
    setInput(value)
  }

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
      }
    })
  }, [input, lookup])

  return (
    <section className="dictionary-lookup">
      <div className="lookup-input-container">
        <input
          type="text"
          className="lookup-input"
          value={input}
          onChange={(event) => syncInputValue(event.currentTarget.value)}
          onInput={(event) => syncInputValue(event.currentTarget.value)}
          onCompositionEnd={(event) => syncInputValue(event.currentTarget.value)}
          placeholder="輸入中文字查詢倉頡/速成碼..."
          disabled={isLoading}
        />
        <span className="lookup-hint">{rows.length} 字</span>
      </div>

      {isLoading && <p className="lookup-message">載入字典中...</p>}
      {loadError && <p className="lookup-message error">{loadError}</p>}

      {rows.length > 0 ? (
        <div className="lookup-results">
          {rows.map((row, index) => (
            <article key={`${index}-${row.char}`} className="lookup-item">
              <span className="lookup-char">{row.char}</span>
              <div className="lookup-codes">
                <div className="code-row">
                  <span className="code-label">倉頡</span>
                  <span className="code-value">{row.cangjie}</span>
                  <span className="code-english">{row.cangjieKeys}</span>
                </div>
                <div className="code-row">
                  <span className="code-label">速成</span>
                  <span className="code-value">{row.quick}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
