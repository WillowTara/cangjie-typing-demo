import { useCallback, useState } from 'react'
import './App.css'
import { useDictionary } from './features/dictionary'
import { DictionaryLookup } from './features/lookup'
import { PRACTICE_TEXTS, ResultScreen, TypingView, useTypingSession } from './features/typing'

type ViewMode = 'typing' | 'lookup' | 'result'

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

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('typing')

  const handleTypingComplete = useCallback(() => {
    setViewMode('result')
  }, [])

  const typing = useTypingSession({
    initialDuration: 60,
    practiceTexts: PRACTICE_TEXTS,
    onComplete: handleTypingComplete,
  })

  const { dictionaryIndex, isLoading: dictLoading, loadError } = useDictionary()

  const handleRestart = () => {
    typing.restart()
    setViewMode('typing')
  }

  return (
    <div className="app">
      <Header viewMode={viewMode} onSwitch={setViewMode} />

      <main className="main">
        {viewMode === 'typing' ? (
          <TypingView
            duration={typing.duration}
            timeLeft={typing.timeLeft}
            wpm={typing.stats.wpm}
            accuracy={typing.stats.accuracy}
            progress={typing.stats.progress}
            practiceText={typing.practiceText}
            expectedChars={typing.expectedChars}
            typedChars={typing.typedChars}
            inputValue={typing.inputValue}
            isFocused={typing.isFocused}
            onDurationChange={typing.changeDuration}
            onReroll={typing.reroll}
            onRestart={typing.restart}
            onFocusChange={typing.setIsFocused}
            onInput={typing.handleInput}
          />
        ) : null}

        {viewMode === 'lookup' ? (
          <DictionaryLookup dictionaryIndex={dictionaryIndex} isLoading={dictLoading} loadError={loadError} />
        ) : null}

        {viewMode === 'result' ? (
          <ResultScreen
            wpm={typing.stats.wpm}
            accuracy={typing.stats.accuracy}
            cpm={typing.stats.cpm}
            correctChars={typing.stats.correctChars}
            totalChars={typing.expectedChars.length}
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
