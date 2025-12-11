import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge classnames correctly', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle conditional classnames', () => {
    const isActive = true
    const result = cn('px-2', isActive && 'bg-blue-500')
    expect(result).toContain('px-2')
    expect(result).toContain('bg-blue-500')
  })

  it('should merge tailwind conflicts correctly', () => {
    const result = cn('px-2 px-4')
    expect(result).toBe('px-4')
  })

  it('should handle array inputs', () => {
    const result = cn(['px-2', 'py-1'])
    expect(result).toBe('px-2 py-1')
  })

  it('should handle object inputs', () => {
    const result = cn({
      'px-2': true,
      'py-1': false,
      'bg-blue': true,
    })
    expect(result).toContain('px-2')
    expect(result).not.toContain('py-1')
    expect(result).toContain('bg-blue')
  })

  it('should handle empty inputs', () => {
    const result = cn('')
    expect(result).toBe('')
  })

  it('should override conflicting tailwind classes', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })
})
