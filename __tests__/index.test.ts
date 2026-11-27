/**
 * Unit tests for the action's entrypoint, src/index.ts
 */
import { jest } from '@jest/globals'

const run = jest.fn<() => Promise<void>>()

// Mock the action's main function
jest.unstable_mockModule('../src/main.js', () => ({ run }))

describe('index', () => {
  it('calls run when imported', async () => {
    await import('../src/index.js')

    expect(run).toHaveBeenCalled()
  })
})
