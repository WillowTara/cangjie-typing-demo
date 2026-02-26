type ResultScreenProps = {
  wpm: number
  accuracy: number
  cpm: number
  correctChars: number
  totalChars: number
  onRetry: () => void
  onLookup: () => void
}

export function ResultScreen({
  wpm,
  accuracy,
  cpm,
  correctChars,
  totalChars,
  onRetry,
  onLookup,
}: ResultScreenProps) {
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
