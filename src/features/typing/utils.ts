export function normalizeChineseText(text: string): string {
  return Array.from(text)
    .filter((char) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(char))
    .join('')
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '∞'
  }

  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function randomPracticeText(currentText: string, practiceTexts: readonly string[]): string {
  const candidates = practiceTexts.filter((text) => text !== currentText)
  if (candidates.length === 0) {
    return currentText
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? currentText
}
