import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { buildDictionaryIndex, type DictionaryEntry, type DictionaryIndex } from './lib/dictionary'

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

function normalizeChineseText(text: string): string {
  return Array.from(text)
    .filter((char) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(char))
    .join('')
}

function codeToEnglishKeys(code: string): string {
  return code.split('').join(' ')
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function randomPracticeText(currentText: string): string {
  const candidates = PRACTICE_TEXTS.filter((text) => text !== currentText)
  if (candidates.length === 0) {
    return currentText
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? currentText
}

function Header({
  viewMode,
  onSwitch,
}: {
  viewMode: ViewMode
  onSwitch: (mode: ViewMode) => void
}) {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">倉</span>
        <span className="logo-text">cangjie</span>
      </div>
      <nav className="nav">
        <button
          type="button"
          className={`nav-btn ${viewMode === 'typing' ? 'active' : ''}`}
          onClick={() => onSwitch('typing')}
        >
          打字
        </button>
        <button
          type="button"
          className={`nav-btn ${viewMode === 'lookup' ? 'active' : ''}`}
          onClick={() => onSwitch('lookup')}
        >
          查碼
        </button>
      </nav>
      <span className="version">Demo</span>
    </header>
  )
}

function ConfigBar({
  duration,
  onDurationChange,
  onReroll,
  onRestart,
}: {
  duration: number
  onDurationChange: (duration: number) => void
  onReroll: () => void
  onRestart: () => void
}) {
  return (
    <div className="config-bar">
      <div className="config-group">
        <span className="config-label">time</span>
        <div className="config-options">
          {[15, 30, 60, 120].map((seconds) => (
            <button
              key={seconds}
              type="button"
              className={`config-option ${duration === seconds ? 'active' : ''}`}
              onClick={() => onDurationChange(seconds)}
            >
              {seconds}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="config-action" onClick={onReroll}>
        換一段
      </button>
      <button type="button" className="config-action" onClick={onRestart}>
        重設
      </button>
    </div>
  )
}

function StatsBar({
  timeLeft,
  wpm,
  accuracy,
  progress,
}: {
  timeLeft: number
  wpm: number
  accuracy: number
  progress: number
}) {
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
      <div className="stat">
        <span className="stat-label">progress</span>
        <span className="stat-value">{progress.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function TypingArea({
  expectedChars,
  typedChars,
  inputValue,
  isFocused,
  onFocusChange,
  onInput,
}: {
  expectedChars: string[]
  typedChars: string[]
  inputValue: string
  isFocused: boolean
  onFocusChange: (focused: boolean) => void
  onInput: (value: string) => void
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  const handleContainerClick = () => {
    onFocusChange(true)
    inputRef.current?.focus()
  }

  return (
    <section className={`typing-area ${isFocused ? 'focused' : ''}`} onClick={handleContainerClick}>
      {!isFocused ? <p className="focus-prompt">點擊輸入框，切到中文輸入法開始練習</p> : null}

      <div className="target-text" aria-label="練習文本">
        {expectedChars.map((char, index) => {
          const typed = typedChars[index]
          const isCurrent = index === typedChars.length

          let className = 'target-char'
          if (typeof typed !== 'undefined') {
            className += typed === char ? ' correct' : ' incorrect'
          } else if (isCurrent) {
            className += ' current'
          }

          return (
            <span key={`${char}-${index}`} className={className}>
              {char}
              {isCurrent ? <span className="caret" /> : null}
            </span>
          )
        })}
      </div>

      <label htmlFor="typing-input" className="typing-input-label">
        請輸入與上方相同的中文內容（不需輸入空格）
      </label>
      <textarea
        id="typing-input"
        ref={inputRef}
        className="typing-input"
        value={inputValue}
        onChange={(event) => onInput(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder="在這裡輸入中文..."
        spellCheck={false}
      />
    </section>
  )
}

function ResultScreen({
  wpm,
  accuracy,
  cpm,
  correctChars,
  totalChars,
  onRetry,
  onLookup,
}: {
  wpm: number
  accuracy: number
  cpm: number
  correctChars: number
  totalChars: number
  onRetry: () => void
  onLookup: () => void
}) {
  return (
    <section className="result-screen">
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
          <span className="result-value">
            {correctChars}/{totalChars}
          </span>
        </div>
      </div>
      <div className="result-actions">
        <button type="button" className="btn-primary" onClick={onRetry}>
          再試一次
        </button>
        <button type="button" className="btn-secondary" onClick={onLookup}>
          去查碼
        </button>
      </div>
    </section>
  )
}

function DictionaryLookup({ dictionaryIndex }: { dictionaryIndex: DictionaryIndex }) {
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
        />
        <span className="lookup-hint">{rows.length} 字</span>
      </div>

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

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('typing')
  const [duration, setDuration] = useState(60)
  const [practiceText, setPracticeText] = useState(PRACTICE_TEXTS[0] ?? '')
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)

  const expectedText = useMemo(() => normalizeChineseText(practiceText), [practiceText])
  const expectedChars = useMemo(() => Array.from(expectedText), [expectedText])
  const typedText = useMemo(() => normalizeChineseText(inputValue), [inputValue])
  const typedChars = useMemo(() => Array.from(typedText), [typedText])

  const stats = useMemo(() => {
    const comparedCount = Math.min(typedChars.length, expectedChars.length)
    let correctChars = 0

    for (let index = 0; index < comparedCount; index += 1) {
      if (typedChars[index] === expectedChars[index]) {
        correctChars += 1
      }
    }

    const accuracy = typedChars.length === 0 ? 100 : (correctChars / typedChars.length) * 100
    const effectiveElapsedSeconds = elapsedSeconds > 0 ? elapsedSeconds : 1
    const minutes = effectiveElapsedSeconds / 60
    const cpm = minutes === 0 ? 0 : Math.round(typedChars.length / minutes)
    const wpm = minutes === 0 ? 0 : Math.round(typedChars.length / 5 / minutes)
    const progress =
      expectedChars.length === 0
        ? 0
        : Math.min(100, (typedChars.length / expectedChars.length) * 100)

    return {
      correctChars,
      accuracy,
      cpm,
      wpm,
      progress,
    }
  }, [typedChars, expectedChars, elapsedSeconds])

  const resetTypingState = (nextDuration: number) => {
    setInputValue('')
    setTimeLeft(nextDuration)
    setElapsedSeconds(0)
    setIsRunning(false)
    setTestCompleted(false)
  }

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

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

    return () => {
      window.clearInterval(timer)
    }
  }, [isRunning])

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      const timeoutId = window.setTimeout(() => {
        setIsRunning(false)
        setTestCompleted(true)
        setViewMode('result')
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    return undefined
  }, [timeLeft, isRunning])

  useEffect(() => {
    if (typedText === expectedText && expectedText.length > 0 && isRunning) {
      const timeoutId = window.setTimeout(() => {
        setIsRunning(false)
        setTestCompleted(true)
        setViewMode('result')
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    return undefined
  }, [typedText, expectedText, isRunning])

  const handleDurationChange = (nextDuration: number) => {
    setDuration(nextDuration)
    resetTypingState(nextDuration)
  }

  const handleReroll = () => {
    setPracticeText((current) => randomPracticeText(current))
    resetTypingState(duration)
    setIsFocused(true)
  }

  const handleRestart = () => {
    resetTypingState(duration)
    setViewMode('typing')
    setIsFocused(true)
  }

  const handleInput = (value: string) => {
    setInputValue(value)

    if (!isRunning && !testCompleted && normalizeChineseText(value).length > 0) {
      setIsRunning(true)
    }
  }

  return (
    <div className="app">
      <Header viewMode={viewMode} onSwitch={setViewMode} />

      <main className="main">
        {viewMode === 'typing' ? (
          <>
            <ConfigBar
              duration={duration}
              onDurationChange={handleDurationChange}
              onReroll={handleReroll}
              onRestart={handleRestart}
            />
            <StatsBar
              timeLeft={timeLeft}
              wpm={stats.wpm}
              accuracy={stats.accuracy}
              progress={stats.progress}
            />
            <TypingArea
              expectedChars={expectedChars}
              typedChars={typedChars}
              inputValue={inputValue}
              isFocused={isFocused}
              onFocusChange={setIsFocused}
              onInput={handleInput}
            />
            <p className="source-text">練習文本：{practiceText}</p>
          </>
        ) : null}

        {viewMode === 'lookup' ? <DictionaryLookup dictionaryIndex={BUILTIN_INDEX} /> : null}

        {viewMode === 'result' ? (
          <ResultScreen
            wpm={stats.wpm}
            accuracy={stats.accuracy}
            cpm={stats.cpm}
            correctChars={stats.correctChars}
            totalChars={expectedChars.length}
            onRetry={handleRestart}
            onLookup={() => setViewMode('lookup')}
          />
        ) : null}
      </main>

      <footer className="footer">
        <p>倉頡/速成輸入法練習 - Demo 版本</p>
      </footer>
    </div>
  )
}

export default App
