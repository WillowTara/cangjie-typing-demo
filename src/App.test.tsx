import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const MOCK_DICTIONARY_JSON = JSON.stringify([
  { char: '日', cangjie: 'A', quick: 'A' },
  { char: '月', cangjie: 'B', quick: 'B' },
])

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(MOCK_DICTIONARY_JSON, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
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
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/sample-dictionary.json')
    })
  })

  it('fetches dictionary data on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/dict/sample-dictionary.json')
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
})
