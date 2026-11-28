import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      reporter: ['json-summary', 'text', 'lcov']
    }
  }
})
