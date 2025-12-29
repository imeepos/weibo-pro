/**
 * 时间工具函数测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUnixTimestamp,
  isExpired,
  parseExpireTime,
  getAbsoluteExpireTime,
  formatTimestamp,
} from '../../utils/time'

describe('Time Utils', () => {
  describe('getUnixTimestamp', () => {
    it('should return current timestamp in milliseconds', () => {
      const before = Date.now()
      const timestamp = getUnixTimestamp()
      const after = Date.now()

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('isExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return false for future timestamp', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const futureTime = now + 60000 // 60 seconds later
      expect(isExpired(futureTime)).toBe(false)
    })

    it('should return true for past timestamp', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const pastTime = now - 60000 // 60 seconds ago
      expect(isExpired(pastTime)).toBe(true)
    })

    it('should consider buffer time (default 30s)', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const futureTime = now + 20000 // 20 seconds later (within buffer)
      expect(isExpired(futureTime)).toBe(true) // Should be expired due to buffer
    })

    it('should use custom buffer time', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const futureTime = now + 20000 // 20 seconds later
      expect(isExpired(futureTime, 10000)).toBe(false) // Buffer is 10s
      expect(isExpired(futureTime, 25000)).toBe(true) // Buffer is 25s
    })

    it('should handle edge case - exactly at buffer boundary', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const futureTime = now + 30000 // Exactly 30 seconds later
      expect(isExpired(futureTime, 30000)).toBe(true)
    })

    it('should handle zero buffer time', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const futureTime = now + 1000 // 1 second later
      expect(isExpired(futureTime, 0)).toBe(false)
      expect(isExpired(now, 0)).toBe(true)
    })
  })

  describe('parseExpireTime', () => {
    it('should parse millisecond timestamp', () => {
      const timestamp = 1704067200000 // 2024-01-01 00:00:00
      expect(parseExpireTime(timestamp)).toBe(timestamp)
    })

    it('should parse second timestamp and convert to milliseconds', () => {
      const timestamp = 1704067200 // 2024-01-01 00:00:00 (in seconds)
      expect(parseExpireTime(timestamp)).toBe(timestamp * 1000)
    })

    it('should parse ISO 8601 string', () => {
      const isoString = '2024-01-01T00:00:00.000Z'
      const expected = new Date(isoString).getTime()
      expect(parseExpireTime(isoString)).toBe(expected)
    })

    it('should throw error for invalid string', () => {
      expect(() => parseExpireTime('invalid-date')).toThrow(
        '无效的过期时间格式'
      )
    })

    it('should handle boundary - detect second vs millisecond timestamp', () => {
      const boundaryMs = 10000000000 // Boundary value
      expect(parseExpireTime(boundaryMs - 1)).toBe((boundaryMs - 1) * 1000)
      expect(parseExpireTime(boundaryMs)).toBe(boundaryMs)
    })
  })

  describe('getAbsoluteExpireTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should calculate absolute timestamp from relative seconds', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const expireSeconds = 60 // 60 seconds
      const result = getAbsoluteExpireTime(expireSeconds)

      // Default buffer is 5 seconds
      expect(result).toBe(now + (60 - 5) * 1000)
    })

    it('should use custom buffer seconds', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const expireSeconds = 60
      const bufferSeconds = 10
      const result = getAbsoluteExpireTime(expireSeconds, bufferSeconds)

      expect(result).toBe(now + (60 - 10) * 1000)
    })

    it('should handle zero buffer', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const expireSeconds = 60
      const result = getAbsoluteExpireTime(expireSeconds, 0)

      expect(result).toBe(now + 60 * 1000)
    })

    it('should handle large expireSeconds', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const expireSeconds = 86400 // 1 day
      const result = getAbsoluteExpireTime(expireSeconds)

      expect(result).toBe(now + (86400 - 5) * 1000)
    })

    it('should handle edge case - buffer equals expireSeconds', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime()
      vi.setSystemTime(now)

      const expireSeconds = 10
      const result = getAbsoluteExpireTime(expireSeconds, 10)

      expect(result).toBe(now) // Expires immediately
    })
  })

  describe('formatTimestamp', () => {
    it('should format timestamp to ISO string', () => {
      const timestamp = 1704067200000 // 2024-01-01 00:00:00 UTC
      const result = formatTimestamp(timestamp)

      expect(result).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should handle zero timestamp', () => {
      const result = formatTimestamp(0)
      expect(result).toBe('1970-01-01T00:00:00.000Z')
    })

    it('should handle negative timestamp (before epoch)', () => {
      const timestamp = -86400000 // 1 day before epoch
      const result = formatTimestamp(timestamp)
      expect(result).toBe('1969-12-31T00:00:00.000Z')
    })
  })
})
