/**
 * Logger Mock
 */

import { vi } from 'vitest'

export class MockLogger {
  debug = vi.fn()
  info = vi.fn()
  warn = vi.fn()
  error = vi.fn()
  log = vi.fn()
}

export function createMockLogger() {
  return new MockLogger()
}
