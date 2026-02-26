import { defineConfig } from 'vitest/config'

// Unit Test Configuration (Node environment)
// For pure logic tests (parsers, utilities, etc.)

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup-node.ts'],
    include: ['src/lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 90,
        lines: 80,
      },
    },
  },
})
