import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Component Test Configuration (jsdom environment)
// For React component tests with DOM
// Requires Node.js 20.19+ or 22.12+

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup-dom.ts'],
    include: ['src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/App.tsx', 'src/config/**/*.ts', 'src/features/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/features/**/index.ts'],
      thresholds: {
        statements: 50,
        branches: 35,
        functions: 40,
        lines: 50,
      },
    },
  },
})
