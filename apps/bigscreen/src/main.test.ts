import { describe, expect, it } from 'vitest'
import { getBaseUrl } from './config/api-base-url'

describe('getBaseUrl', () => {
  it('uses the same origin for deployed pages', () => {
    expect(getBaseUrl(new URL('http://192.168.0.102:18088/index'))).toBe(
      'http://192.168.0.102:18088/api/auth'
    )
  })

  it('uses the configured API base URL when provided', () => {
    expect(
      getBaseUrl(new URL('http://localhost:9088/index'), 'http://localhost:8089')
    ).toBe('http://localhost:8089/api/auth')
  })
})
