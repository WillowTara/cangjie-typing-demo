import { useEffect, useRef } from 'react'
import { formatTime } from './utils'

type TypingViewProps = {
  duration: number
  timeLeft: number
  wpm: number
  accuracy: number
  progress: number
  practiceText: string
  expectedChars: string[]
  typedChars: string[]
  inputValue: string
  isFocused: boolean
  onDurationChange: (duration: number) => void
  onReroll: () => void
  onRestart: () => void
  onFocusChange: (focused: boolean) => void
  onInput: (value: string) => void
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

export function TypingView({
  duration,
  timeLeft,
  wpm,
  accuracy,
  progress,
  practiceText,
  expectedChars,
  typedChars,
  inputValue,
  isFocused,
  onDurationChange,
  onReroll,
  onRestart,
  onFocusChange,
  onInput,
}: TypingViewProps) {
  return (
    <>
      <ConfigBar
        duration={duration}
        onDurationChange={onDurationChange}
        onReroll={onReroll}
        onRestart={onRestart}
      />
      <StatsBar timeLeft={timeLeft} wpm={wpm} accuracy={accuracy} progress={progress} />
      <TypingArea
        expectedChars={expectedChars}
        typedChars={typedChars}
        inputValue={inputValue}
        isFocused={isFocused}
        onFocusChange={onFocusChange}
        onInput={onInput}
      />
      <p className="source-text">練習文本：{practiceText}</p>
    </>
  )
}
