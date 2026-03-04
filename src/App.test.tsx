import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { OFFLINE_WHITELIST_PRACTICE_MATERIALS } from './features/typing'
import { normalizeChineseText } from './features/typing/utils'
import { useTypingSession } from './features/typing/useTypingSession'
import { encodeDictionaryBinary } from './lib/dictionaryBinary'
import type { DictionaryEntry } from './lib/dictionary'

const MOCK_ENTRIES: DictionaryEntry[] = [
  { char: '日', cangjie: 'A', quick: 'A' },
  { char: '月', cangjie: 'B', quick: 'B' },
]

const MOCK_DICTIONARY_JSON = JSON.stringify(MOCK_ENTRIES)
const MOCK_WIKIPEDIA_FULL_EXTRACT =
  '貓是小型食肉目哺乳動物常見於人類生活環境中具備靈活行動與敏銳感官。'.repeat(15)
const MOCK_WIKIPEDIA_RANDOM = {
  query: {
    pages: [
      {
        title: '貓',
        fullurl: 'https://zh.wikipedia.org/wiki/%E8%B2%93',
        extract: MOCK_WIKIPEDIA_FULL_EXTRACT,
        revisions: [{ revid: 123456789 }],
      },
    ],
  },
}
const MOCK_CORE_BINARY = encodeDictionaryBinary(MOCK_ENTRIES)
const MOCK_CORE_BINARY_BODY = new Uint8Array(MOCK_CORE_BINARY)
const MOCK_CORE_BINARY_ARRAY_BUFFER = (() => {
  const out = new ArrayBuffer(MOCK_CORE_BINARY_BODY.byteLength)
  new Uint8Array(out).set(MOCK_CORE_BINARY_BODY)
  return out
})()

function readPracticeLengthFromPreview(): number {
  const previewText = screen.getByText(/^練習文本：全文約/).textContent ?? ''
  const match = previewText.match(/全文約\s*(\d+)\s*字/)
  return match ? Number(match[1]) : 0
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const requestUrl = typeof input === 'string' ? input : input.toString()

    if (requestUrl.toLowerCase().endsWith('.bin')) {
      return new Response(MOCK_CORE_BINARY_ARRAY_BUFFER, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    }

    if (requestUrl.includes('zh.wikipedia.org/w/api.php')) {
      return new Response(JSON.stringify(MOCK_WIKIPEDIA_RANDOM), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(MOCK_DICTIONARY_JSON, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('App', () => {
  it('keeps offline whitelist articles within first three paragraphs without template rewrites', () => {
    const artifactKeywords = ['完整收錄篇章', '白名單素材', '三行摘要截斷', '本篇內容為離線完整文章版本', 'prompt']
    const likelySimplifiedCharacters = ['这', '们', '发', '东', '应', '学', '国', '龙', '术', '广', '车', '书', '云', '气', '电', '门', '开', '长', '见', '观', '风', '飞', '马', '鸟', '鱼']

    for (const material of OFFLINE_WHITELIST_PRACTICE_MATERIALS) {
      const paragraphs = material.text
        .split(/\n\s*\n/u)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)

      expect(paragraphs.length).toBeLessThanOrEqual(3)
      expect(normalizeChineseText(material.text).length).toBeGreaterThanOrEqual(80)

      for (const keyword of artifactKeywords) {
        expect(material.text.toLowerCase()).not.toContain(keyword.toLowerCase())
      }

      for (const character of likelySimplifiedCharacters) {
        expect(material.text).not.toContain(character)
      }
    }
  })

  it('uses offline whitelist material by default', async () => {
    render(<App />)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/full.latest.v2.bin')
    })

    expect(readPracticeLengthFromPreview()).toBeGreaterThan(140)
  })

  it('renders typing mode by default', async () => {
    render(<App />)

    expect(screen.getByRole('button', { name: '打字' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查碼' })).toBeInTheDocument()
    expect(screen.getAllByText('time').length).toBeGreaterThan(0)
    expect(screen.getByText('點擊輸入框，切到中文輸入法開始練習')).toBeInTheDocument()

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/full.latest.v2.bin')
    })
  })

  it('fetches dictionary data on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/full.latest.v2.bin')
    })
  })

  it('uses configured dictionary URL from environment', async () => {
    vi.stubEnv('VITE_DICTIONARY_URL', '/dict/custom-dictionary.json')

    render(<App />)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/custom-dictionary.json')
    })
  })

  it('switches to lookup mode and displays query results', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '查碼' }))
    const input = screen.getByPlaceholderText('輸入中文字查詢倉頡/速成碼...')

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })

    await user.type(input, '日月')

    expect(screen.getByText('2 字')).toBeInTheDocument()
    expect(screen.getAllByText('倉頡').length).toBeGreaterThan(0)
    expect(screen.getAllByText('速成').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('B').length).toBeGreaterThan(0)
  })

  it('shows fallback marker for unknown characters', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '查碼' }))
    const input = screen.getByPlaceholderText('輸入中文字查詢倉頡/速成碼...')

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })

    await user.type(input, '木')

    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('keeps lookup rows in sync after replacing repeated characters', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '查碼' }))
    const input = screen.getByPlaceholderText('輸入中文字查詢倉頡/速成碼...')

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })

    await user.type(input, '日日')
    await waitFor(() => {
      expect(screen.getByText('2 字')).toBeInTheDocument()
    })

    let chars = Array.from(container.querySelectorAll('.lookup-item .lookup-char')).map(
      (node) => node.textContent,
    )
    expect(chars).toEqual(['日', '日'])

    await user.clear(input)
    await user.type(input, '日月日木')
    await waitFor(() => {
      expect(screen.getByText('4 字')).toBeInTheDocument()
    })

    chars = Array.from(container.querySelectorAll('.lookup-item .lookup-char')).map(
      (node) => node.textContent,
    )
    expect(chars).toEqual(['日', '月', '日', '木'])
    expect(container.querySelectorAll('.lookup-item')).toHaveLength(4)

    const hasDuplicateKeyWarning = consoleErrorSpy.mock.calls.some(
      ([message]) => typeof message === 'string' && message.includes('same key'),
    )
    expect(hasDuplicateKeyWarning).toBe(false)
    consoleErrorSpy.mockRestore()
  })

  it('uses committed IME text for lookup rows on composition end', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '查碼' }))
    const input = screen.getByPlaceholderText('輸入中文字查詢倉頡/速成碼...')

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '手田' } })

    ;(input as HTMLInputElement).value = '抽水抽水'
    fireEvent.compositionEnd(input)

    await waitFor(() => {
      expect(screen.getByText('4 字')).toBeInTheDocument()
    })

    const chars = Array.from(container.querySelectorAll('.lookup-item .lookup-char')).map(
      (node) => node.textContent,
    )
    expect(chars).toEqual(['抽', '水', '抽', '水'])
  })

  it('reconciles lookup rows when final IME value lands after composition end', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '查碼' }))
    const input = screen.getByPlaceholderText('輸入中文字查詢倉頡/速成碼...')

    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '手田' } })

    ;(input as HTMLInputElement).value = '手田'
    fireEvent.compositionEnd(input)
    ;(input as HTMLInputElement).value = '抽水'

    await waitFor(() => {
      const chars = Array.from(container.querySelectorAll('.lookup-item .lookup-char')).map(
        (node) => node.textContent,
      )
      expect(chars).toEqual(['抽', '水'])
    })
  })

  it('loads full wikipedia material when switching to online source mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('素材來源：離線白名單')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '線上維基隨機' }))

    await waitFor(() => {
      expect(screen.getByText('素材來源：線上維基隨機')).toBeInTheDocument()
      expect(screen.getByText('修訂ID：123456789')).toBeInTheDocument()
    })

    expect(readPracticeLengthFromPreview()).toBeGreaterThan(280)

    const apiCall = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes('zh.wikipedia.org/w/api.php'))

    const apiUrl = typeof apiCall?.[0] === 'string' ? apiCall[0] : apiCall?.[0]?.toString() ?? ''
    expect(apiUrl).toContain('grnlimit=5')
    expect(apiUrl).toContain('grnfilterredir=nonredirects')
    expect(apiUrl).not.toContain('exintro=1')

    expect(
      vi.mocked(globalThis.fetch).mock.calls.some(([input]) =>
        (typeof input === 'string' ? input : input.toString()).includes('zh.wikipedia.org/w/api.php'),
      ),
    ).toBe(true)
  })

  it('rerolls wikipedia material from the same button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '線上維基隨機' }))

    await waitFor(() => {
      expect(screen.getByText('素材來源：線上維基隨機')).toBeInTheDocument()
    })

    const beforeCalls = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([input]) =>
        (typeof input === 'string' ? input : input.toString()).includes('zh.wikipedia.org/w/api.php'),
      ).length

    await user.click(screen.getByRole('button', { name: '換一段' }))

    await waitFor(() => {
      const afterCalls = vi
        .mocked(globalThis.fetch)
        .mock.calls.filter(([input]) =>
          (typeof input === 'string' ? input : input.toString()).includes('zh.wikipedia.org/w/api.php'),
        ).length
      expect(afterCalls).toBeGreaterThan(beforeCalls)
    })
  })

  it('supports unlimited duration mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '不限時' }))

    expect(screen.getByText('∞')).toBeInTheDocument()
  })

  it('auto-scrolls target text while typing', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
    const scrollIntoViewMock = vi.fn()

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    })

    try {
      render(<App />)
      const input = screen.getByPlaceholderText('在這裡輸入中文...')

      fireEvent.change(input, { target: { value: '測' } })

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled()
      })
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      })
    }
  })

  it('completes typing when expected text is matched with extra trailing characters', () => {
    vi.useFakeTimers()

    try {
      const onComplete = vi.fn()
      const { result } = renderHook(() =>
        useTypingSession({
          initialDuration: Number.POSITIVE_INFINITY,
          practiceTexts: ['你好世界'],
          onComplete,
        }),
      )

      act(() => {
        result.current.handleInput('你好世界測')
      })

      act(() => {
        vi.runOnlyPendingTimers()
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(result.current.stats.progress).toBe(100)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pauses typing timer updates when session becomes inactive', () => {
    vi.useFakeTimers()

    try {
      const onComplete = vi.fn()
      const { result, rerender } = renderHook(
        ({ isActive }: { isActive: boolean }) =>
          useTypingSession({
            initialDuration: 15,
            isActive,
            practiceTexts: ['測試內容'],
            onComplete,
          }),
        {
          initialProps: { isActive: true },
        },
      )

      act(() => {
        result.current.handleInput('測')
      })

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      const pausedAt = result.current.timeLeft

      act(() => {
        rerender({ isActive: false })
      })

      act(() => {
        vi.advanceTimersByTime(120000)
      })

      expect(result.current.timeLeft).toBe(pausedAt)
      expect(onComplete).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
