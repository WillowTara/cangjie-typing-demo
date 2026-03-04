import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { encodeDictionaryBinary } from './lib/dictionaryBinary'
import type { DictionaryEntry } from './lib/dictionary'

const MOCK_ENTRIES: DictionaryEntry[] = [
  { char: '日', cangjie: 'A', quick: 'A' },
  { char: '月', cangjie: 'B', quick: 'B' },
]

const MOCK_DICTIONARY_JSON = JSON.stringify(MOCK_ENTRIES)
const MOCK_CORE_BINARY = encodeDictionaryBinary(MOCK_ENTRIES)
const MOCK_CORE_BINARY_BODY = new Uint8Array(MOCK_CORE_BINARY)
const MOCK_CORE_BINARY_ARRAY_BUFFER = (() => {
  const out = new ArrayBuffer(MOCK_CORE_BINARY_BODY.byteLength)
  new Uint8Array(out).set(MOCK_CORE_BINARY_BODY)
  return out
})()

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const requestUrl = typeof input === 'string' ? input : input.toString()

    if (requestUrl.toLowerCase().endsWith('.bin')) {
      return new Response(MOCK_CORE_BINARY_ARRAY_BUFFER, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
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
})
