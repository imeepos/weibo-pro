import { describe, it, expect, vi } from 'vitest'
import { isBrowser } from './is-browser'

describe('isBrowser', () => {
  it('should detect browser environment', () => {
    // In jsdom test environment, window should be defined
    expect(isBrowser).toBe(true)
  })

  it('should be a boolean', () => {
    expect(typeof isBrowser).toBe('boolean')
  })
})
