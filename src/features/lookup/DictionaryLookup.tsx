import { useMemo, useState } from 'react'
import type { DictionaryIndex } from '../../lib/dictionary'

function codeToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}

type DictionaryLookupProps = {
  dictionaryIndex: DictionaryIndex
  isLoading?: boolean
  loadError?: string
}

export function DictionaryLookup({ dictionaryIndex, isLoading, loadError }: DictionaryLookupProps) {
  const [input, setInput] = useState('')

  const rows = useMemo(() => {
    if (!input.trim()) {
      return []
    }

    return Array.from(input).map((char) => {
      const entry = dictionaryIndex.map.get(char)
      return {
        char,
        cangjie: entry?.cangjie ?? '-',
        quick: entry?.quick ?? '-',
        cangjieKeys: entry ? codeToEnglishKeys(entry.cangjie) : '-',
      }
    })
  }, [input, dictionaryIndex])

  return (
    <section className="dictionary-lookup">
      <div className="lookup-input-container">
        <input
          type="text"
          className="lookup-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="輸入中文字查詢倉頡/速成碼..."
          disabled={isLoading}
        />
        <span className="lookup-hint">{rows.length} 字</span>
      </div>

      {isLoading && <p className="lookup-message">載入字典中...</p>}
      {loadError && <p className="lookup-message error">{loadError}</p>}

      {rows.length > 0 ? (
        <div className="lookup-results">
          {rows.map((row) => (
            <article key={`${row.char}-${row.cangjie}-${row.quick}`} className="lookup-item">
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
