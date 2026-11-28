/**
 * Unit tests for the action's entrypoint, src/index.ts
 */
import { describe, expect, it, vi } from 'vitest'

const run = vi.fn<() => Promise<void>>()

// Mock the action's main function
vi.doMock('../src/main.js', () => ({ run }))

describe('index', () => {
  it('calls run when imported', async () => {
    await import('../src/index.js')

    expect(run).toHaveBeenCalled()
  })
})
