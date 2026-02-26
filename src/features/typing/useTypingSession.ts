import { useEffect, useMemo, useState } from 'react'
import { normalizeChineseText, randomPracticeText } from './utils'

export type TypingStats = {
  correctChars: number
  accuracy: number
  cpm: number
  wpm: number
  progress: number
}

type UseTypingSessionOptions = {
  initialDuration?: number
  practiceTexts: readonly string[]
  onComplete: () => void
}

export type TypingSession = {
  duration: number
  practiceText: string
  inputValue: string
  timeLeft: number
  isFocused: boolean
  expectedChars: string[]
  typedChars: string[]
  stats: TypingStats
  setIsFocused: (focused: boolean) => void
  handleInput: (value: string) => void
  changeDuration: (nextDuration: number) => void
  reroll: () => void
  restart: () => void
}

export function useTypingSession({
  initialDuration = 60,
  practiceTexts,
  onComplete,
}: UseTypingSessionOptions): TypingSession {
  const [duration, setDuration] = useState(initialDuration)
  const [practiceText, setPracticeText] = useState(practiceTexts[0] ?? '')
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(initialDuration)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)

  const expectedText = useMemo(() => normalizeChineseText(practiceText), [practiceText])
  const expectedChars = useMemo(() => Array.from(expectedText), [expectedText])
  const typedText = useMemo(() => normalizeChineseText(inputValue), [inputValue])
  const typedChars = useMemo(() => Array.from(typedText), [typedText])

  const stats = useMemo((): TypingStats => {
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
      expectedChars.length === 0 ? 0 : Math.min(100, (typedChars.length / expectedChars.length) * 100)

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
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    return undefined
  }, [typedText, expectedText, isRunning])

  useEffect(() => {
    if (testCompleted) {
      onComplete()
    }
  }, [testCompleted, onComplete])

  const changeDuration = (nextDuration: number) => {
    setDuration(nextDuration)
    resetTypingState(nextDuration)
  }

  const reroll = () => {
    setPracticeText((current) => randomPracticeText(current, practiceTexts))
    resetTypingState(duration)
    setIsFocused(true)
  }

  const restart = () => {
    resetTypingState(duration)
    setIsFocused(true)
  }

  const handleInput = (value: string) => {
    setInputValue(value)

    if (!isRunning && !testCompleted && normalizeChineseText(value).length > 0) {
      setIsRunning(true)
    }
  }

  return {
    duration,
    practiceText,
    inputValue,
    timeLeft,
    isFocused,
    expectedChars,
    typedChars,
    stats,
    setIsFocused,
    handleInput,
    changeDuration,
    reroll,
    restart,
  }
}
