import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
