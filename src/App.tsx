import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  buildDictionaryIndex,
  type DictionaryEntry,
  type DictionaryIndex,
} from './lib/dictionary'

type InputMode = 'cangjie' | 'quick'
type ViewMode = 'typing' | 'lookup' | 'result'

const DICTIONARY: DictionaryEntry[] = [
  { char: '日', cangjie: 'A', quick: 'A' },
  { char: '月', cangjie: 'B', quick: 'B' },
  { char: '金', cangjie: 'C', quick: 'C' },
  { char: '木', cangjie: 'D', quick: 'D' },
  { char: '水', cangjie: 'E', quick: 'E' },
  { char: '火', cangjie: 'F', quick: 'F' },
  { char: '土', cangjie: 'G', quick: 'G' },
  { char: '竹', cangjie: 'H', quick: 'H' },
  { char: '戈', cangjie: 'I', quick: 'I' },
  { char: '十', cangjie: 'J', quick: 'J' },
  { char: '大', cangjie: 'K', quick: 'K' },
  { char: '中', cangjie: 'L', quick: 'L' },
  { char: '一', cangjie: 'M', quick: 'M' },
  { char: '弓', cangjie: 'N', quick: 'N' },
  { char: '人', cangjie: 'O', quick: 'O' },
  { char: '心', cangjie: 'P', quick: 'P' },
  { char: '手', cangjie: 'Q', quick: 'Q' },
  { char: '口', cangjie: 'R', quick: 'R' },
  { char: '尸', cangjie: 'S', quick: 'S' },
  { char: '廿', cangjie: 'T', quick: 'T' },
  { char: '山', cangjie: 'U', quick: 'U' },
  { char: '女', cangjie: 'V', quick: 'V' },
  { char: '田', cangjie: 'W', quick: 'W' },
  { char: '卜', cangjie: 'Y', quick: 'Y' },
  { char: '重', cangjie: 'Z', quick: 'Z' },
  { char: '明', cangjie: 'AB', quick: 'AB' },
  { char: '林', cangjie: 'DD', quick: 'DD' },
  { char: '森', cangjie: 'DDD', quick: 'DD' },
  { char: '炎', cangjie: 'FF', quick: 'FF' },
  { char: '休', cangjie: 'OD', quick: 'OD' },
  { char: '好', cangjie: 'VN', quick: 'VN' },
  { char: '你', cangjie: 'ONF', quick: 'OF' },
  { char: '他', cangjie: 'OPD', quick: 'OD' },
  { char: '我', cangjie: 'HQI', quick: 'HI' },
  { char: '們', cangjie: 'OAN', quick: 'ON' },
  { char: '學', cangjie: 'HBD', quick: 'HD' },
  { char: '生', cangjie: 'HQM', quick: 'HM' },
  { char: '工', cangjie: 'M', quick: 'M' },
  { char: '作', cangjie: 'OHS', quick: 'OS' },
  { char: '字', cangjie: 'JND', quick: 'JD' },
  { char: '練', cangjie: 'VFD', quick: 'VD' },
  { char: '習', cangjie: 'SIM', quick: 'SM' },
  { char: '快', cangjie: 'PDK', quick: 'PK' },
  { char: '樂', cangjie: 'VID', quick: 'VD' },
  { char: '天', cangjie: 'MK', quick: 'MK' },
  { char: '地', cangjie: 'GPD', quick: 'GD' },
  { char: '文', cangjie: 'YK', quick: 'YK' },
  { char: '語', cangjie: 'YRR', quick: 'YR' },
  { char: '白', cangjie: 'HA', quick: 'HA' },
  { char: '話', cangjie: 'YHR', quick: 'YR' },
]

const BUILTIN_INDEX: DictionaryIndex = buildDictionaryIndex(DICTIONARY)

const PRACTICE_TEXTS = [
  '我們學中文 白話文練習',
  '日月山水 天地人心',
  '木火土金水 打字練習',
  '你我他 都愛學習',
]

function phraseToCodes(
  phrase: string,
  mode: InputMode,
  dictionaryMap: DictionaryIndex['map'],
): string[] {
  return Array.from(phrase).map((char) => {
    if (char === ' ') return '/'
    const entry = dictionaryMap.get(char)
    if (!entry) return '?'
    return mode === 'cangjie' ? entry.cangjie : entry.quick
  })
}

function codeToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}

function Header({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">倉</span>
          <span className="logo-text">cangjie</span>
        </div>
      </div>
      <nav className="nav">
        <button
          className={`nav-btn ${viewMode === 'typing' ? 'active' : ''}`}
          onClick={() => setViewMode('typing')}
        >
          打字
        </button>
        <button
          className={`nav-btn ${viewMode === 'lookup' ? 'active' : ''}`}
          onClick={() => setViewMode('lookup')}
        >
          查碼
        </button>
      </nav>
      <div className="header-right">
        <span className="version">Demo</span>
      </div>
    </header>
  )
}

function ConfigBar({
  mode,
  setMode,
  duration,
  setDuration,
  onRestart,
}: {
  mode: InputMode
  setMode: (mode: InputMode) => void
  duration: number
  setDuration: (duration: number) => void
  onRestart: () => void
}) {
  return (
    <div className="config-bar">
      <div className="config-group">
        <span className="config-label">mode</span>
        <div className="config-options">
          <button
            className={`config-option ${mode === 'cangjie' ? 'active' : ''}`}
            onClick={() => setMode('cangjie')}
          >
            倉頡
          </button>
          <button
            className={`config-option ${mode === 'quick' ? 'active' : ''}`}
            onClick={() => setMode('quick')}
          >
            速成
          </button>
        </div>
      </div>
      <div className="config-group">
        <span className="config-label">time</span>
        <div className="config-options">
          {[15, 30, 60, 120].map((sec) => (
            <button
              key={sec}
              className={`config-option ${duration === sec ? 'active' : ''}`}
              onClick={() => setDuration(sec)}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>
      <button className="restart-btn" onClick={onRestart}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      </button>
    </div>
  )
}

function StatsBar({
  timeLeft,
  wpm,
  accuracy,
}: {
  timeLeft: number
  wpm: number
  accuracy: number
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-label">time</span>
        <span className="stat-value">{formatTime(timeLeft)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">wpm</span>
        <span className="stat-value">{wpm}</span>
      </div>
      <div className="stat">
        <span className="stat-label">acc</span>
        <span className="stat-value">{accuracy.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function TypingArea({
  expectedTokens,
  typedTokens,
  isFocused,
  setIsFocused,
  onInput,
  inputValue,
}: {
  expectedTokens: string[]
  typedTokens: string[]
  isFocused: boolean
  setIsFocused: (focused: boolean) => void
  onInput: (value: string) => void
  inputValue: string
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  const handleClick = () => {
    setIsFocused(true)
    inputRef.current?.focus()
  }

  return (
    <div
      className={`typing-area ${isFocused ? 'focused' : ''}`}
      onClick={handleClick}
    >
      {!isFocused && (
        <div className="focus-prompt">
          <span>點擊或按任意鍵開始</span>
        </div>
      )}

      <div className="words-container">
        {expectedTokens.map((token, index) => {
          const typed = typedTokens[index]
          const isCurrent = index === typedTokens.length

          let className = 'word'
          if (typed) {
            className += typed === token ? ' correct' : ' incorrect'
          } else if (isCurrent) {
            className += ' current'
          }

          return (
            <span key={index} className={className}>
              {token}
              {isCurrent && <span className="caret" />}
            </span>
          )
        })}
      </div>

      <textarea
        ref={inputRef}
        className="hidden-input"
        value={inputValue}
        onChange={(e) => onInput(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}

function ResultScreen({
  wpm,
  accuracy,
  cpm,
  correctTokens,
  totalTokens,
  onRestart,
  onSwitchMode,
}: {
  wpm: number
  accuracy: number
  cpm: number
  correctTokens: number
  totalTokens: number
  onRestart: () => void
  onSwitchMode: () => void
}) {
  return (
    <div className="result-screen">
      <h2 className="result-title">測試完成</h2>

      <div className="result-stats">
        <div className="result-stat main">
          <span className="result-label">wpm</span>
          <span className="result-value">{wpm}</span>
        </div>
        <div className="result-stat">
          <span className="result-label">acc</span>
          <span className="result-value">{accuracy.toFixed(0)}%</span>
        </div>
        <div className="result-stat">
          <span className="result-label">cpm</span>
          <span className="result-value">{cpm}</span>
        </div>
        <div className="result-stat">
          <span className="result-label">chars</span>
          <span className="result-value">{correctTokens}/{totalTokens}</span>
        </div>
      </div>

      <div className="result-actions">
        <button className="btn-primary" onClick={onRestart}>
          再測一次
        </button>
        <button className="btn-secondary" onClick={onSwitchMode}>
          查碼字典
        </button>
      </div>
    </div>
  )
}

function DictionaryLookup({
  dictionaryIndex,
}: {
  dictionaryIndex: DictionaryIndex
}) {
  const [input, setInput] = useState('')

  const results = useMemo(() => {
    if (!input.trim()) return []
    return Array.from(input).map((char) => {
      const entry = dictionaryIndex.map.get(char)
      return {
        char,
        cangjie: entry?.cangjie ?? '-',
        quick: entry?.quick ?? '-',
        english: entry ? codeToEnglishKeys(entry.cangjie) : '-',
      }
    })
  }, [input, dictionaryIndex])

  return (
    <div className="dictionary-lookup">
      <div className="lookup-input-container">
        <input
          type="text"
          className="lookup-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入中文字查詢倉頡/速成碼..."
        />
        <span className="lookup-hint">{results.length} 字</span>
      </div>

      {results.length > 0 && (
        <div className="lookup-results">
          {results.map((item, index) => (
            <div key={index} className="lookup-item">
              <span className="lookup-char">{item.char}</span>
              <div className="lookup-codes">
                <div className="code-row">
                  <span className="code-label">倉頡</span>
                  <span className="code-value">{item.cangjie}</span>
                  <span className="code-english">{item.english}</span>
                </div>
                <div className="code-row">
                  <span className="code-label">速成</span>
                  <span className="code-value">{item.quick}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('typing')
  const [dictionaryIndex] = useState<DictionaryIndex>(BUILTIN_INDEX)

  // Typing test states
  const [practiceMode, setPracticeMode] = useState<InputMode>('cangjie')
  const [duration, setDuration] = useState(60)
  const [practiceText] = useState(PRACTICE_TEXTS[0])
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [isRunning, setIsRunning] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [testCompleted, setTestCompleted] = useState(false)

  const expectedTokens = useMemo(() => {
    const source = practiceText.replace(/\s+/g, '')
    return phraseToCodes(source, practiceMode, dictionaryIndex.map)
  }, [practiceText, practiceMode, dictionaryIndex])

  const typedTokens = useMemo(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return []
    return trimmed.split(/\s+/)
  }, [inputValue])

  const stats = useMemo(() => {
    const typedChars = typedTokens.join('').length
    const comparedCount = Math.min(typedTokens.length, expectedTokens.length)
    let correctTokens = 0

    for (let i = 0; i < comparedCount; i++) {
      if (typedTokens[i]?.toUpperCase() === expectedTokens[i]) {
        correctTokens++
      }
    }

    const accuracy =
      typedTokens.length === 0 ? 100 : (correctTokens / typedTokens.length) * 100
    const effectiveElapsed = elapsedSeconds > 0 ? elapsedSeconds : 1
    const minutes = effectiveElapsed / 60
    const cpm = minutes === 0 ? 0 : Math.round(typedChars / minutes)
    const wpm = minutes === 0 ? 0 : Math.round(typedChars / 5 / minutes)

    return {
      cpm,
      wpm,
      accuracy,
      correctTokens,
      totalTokens: typedTokens.length,
    }
  }, [typedTokens, expectedTokens, elapsedSeconds])

  // Reset test state
  const resetTest = useCallback(() => {
    setTimeLeft(duration)
    setInputValue('')
    setIsRunning(false)
    setElapsedSeconds(0)
    setTestCompleted(false)
  }, [duration])

  // Initialize test when dependencies change
  useEffect(() => {
    const timeoutId = window.setTimeout(resetTest, 0)
    return () => window.clearTimeout(timeoutId)
  }, [resetTest])

  // Timer effect
  useEffect(() => {
    if (!isRunning) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRunning])

  // Handle test completion when time runs out
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      const timeoutId = window.setTimeout(() => {
        setIsRunning(false)
        setTestCompleted(true)
        setViewMode('result')
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [timeLeft, isRunning])

  // Check for all tokens typed
  useEffect(() => {
    if (
      typedTokens.length >= expectedTokens.length &&
      expectedTokens.length > 0 &&
      isRunning
    ) {
      const timeoutId = window.setTimeout(() => {
        setIsRunning(false)
        setTestCompleted(true)
        setViewMode('result')
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [typedTokens.length, expectedTokens.length, isRunning])

  const handleInput = (value: string) => {
    const normalized = value.toUpperCase()

    if (!isRunning && normalized.trim() && !testCompleted) {
      setIsRunning(true)
    }

    setInputValue(normalized)
  }

  const handleRestart = () => {
    setInputValue('')
    setTimeLeft(duration)
    setIsRunning(false)
    setElapsedSeconds(0)
    setTestCompleted(false)
    setViewMode('typing')
    setIsFocused(true)
  }

  return (
    <div className="app">
      <Header viewMode={viewMode} setViewMode={setViewMode} />

      <main className="main">
        {viewMode === 'typing' && (
          <>
            <ConfigBar
              mode={practiceMode}
              setMode={setPracticeMode}
              duration={duration}
              setDuration={setDuration}
              onRestart={handleRestart}
            />
            <StatsBar
              timeLeft={timeLeft}
              wpm={stats.wpm}
              accuracy={stats.accuracy}
            />
            <TypingArea
              expectedTokens={expectedTokens}
              typedTokens={typedTokens}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              onInput={handleInput}
              inputValue={inputValue}
            />
            <div className="source-text">原文：{practiceText}</div>
          </>
        )}

        {viewMode === 'lookup' && (
          <DictionaryLookup dictionaryIndex={dictionaryIndex} />
        )}

        {viewMode === 'result' && (
          <ResultScreen
            wpm={stats.wpm}
            accuracy={stats.accuracy}
            cpm={stats.cpm}
            correctTokens={stats.correctTokens}
            totalTokens={stats.totalTokens}
            onRestart={handleRestart}
            onSwitchMode={() => setViewMode('lookup')}
          />
        )}
      </main>

      <footer className="footer">
        <p>倉頡/速成輸入法練習 - Demo 版本</p>
      </footer>
    </div>
  )
}

export default App
