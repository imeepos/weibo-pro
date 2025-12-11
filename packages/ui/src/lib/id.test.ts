import { describe, it, expect } from 'vitest'
import { generateId } from './id'

describe('generateId', () => {
  it('should generate a valid UUID v4 format', () => {
    const id = generateId()
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidV4Pattern)
  })

  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    const id3 = generateId()

    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
    expect(id1).not.toBe(id3)
  })

  it('should generate IDs of correct length', () => {
    const id = generateId()
    expect(id).toHaveLength(36) // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  })

  it('should have correct UUID v4 version bits', () => {
    const id = generateId()
    const parts = id.split('-')
    const thirdPart = parts[2]
    // Version is always 4 in UUID v4
    expect(thirdPart.charAt(0)).toBe('4')
  })

  it('should have correct variant bits', () => {
    const id = generateId()
    const parts = id.split('-')
    const fourthPart = parts[3]
    const firstChar = fourthPart.charAt(0).toLowerCase()
    // Variant bits should be 8, 9, a, or b
    expect(['8', '9', 'a', 'b']).toContain(firstChar)
  })

  it('should handle multiple rapid generations', () => {
    const ids = Array.from({ length: 100 }, () => generateId())
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(100)
  })
})
