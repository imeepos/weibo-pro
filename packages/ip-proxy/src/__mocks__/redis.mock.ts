/**
 * Redis Mock
 */

import { vi } from 'vitest'

export class MockRedisClient {
  private data: Map<string, any> = new Map()
  private sortedSets: Map<string, Map<string, number>> = new Map()

  zadd = vi.fn(async (key: string, score: number, member: string) => {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map())
    }
    this.sortedSets.get(key)!.set(member, score)
    return 1
  })

  zrange = vi.fn(async (key: string, start: number, stop: number) => {
    const set = this.sortedSets.get(key)
    if (!set) return []

    const sorted = Array.from(set.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member)

    if (stop === -1) return sorted.slice(start)
    return sorted.slice(start, stop + 1)
  })

  zincrby = vi.fn(async (key: string, increment: number, member: string) => {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map())
    }
    const set = this.sortedSets.get(key)!
    const current = set.get(member) || 0
    const newScore = current + increment
    set.set(member, newScore)
    return newScore
  })

  zrem = vi.fn(async (key: string, ...members: string[]) => {
    const set = this.sortedSets.get(key)
    if (!set) return 0

    let removed = 0
    for (const member of members) {
      if (set.delete(member)) removed++
    }
    return removed
  })

  zcard = vi.fn(async (key: string) => {
    return this.sortedSets.get(key)?.size || 0
  })

  hmset = vi.fn(async (key: string, data: Record<string, string>) => {
    this.data.set(key, data)
    return 'OK'
  })

  hgetall = vi.fn(async (key: string) => {
    return this.data.get(key) || {}
  })

  expire = vi.fn(async (_key: string, _seconds: number) => {
    return 1
  })

  del = vi.fn(async (...keys: string[]) => {
    let deleted = 0
    for (const key of keys) {
      if (this.data.delete(key)) deleted++
    }
    return deleted
  })

  clear() {
    this.data.clear()
    this.sortedSets.clear()
  }
}

export function createMockRedis() {
  return new MockRedisClient()
}
