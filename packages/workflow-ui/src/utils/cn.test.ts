import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn - Classname Utility', () => {
  it('应该合并简单的 class 字符串', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('应该处理 falsy 值', () => {
    expect(cn('px-4', false, 'py-2', null, undefined)).toBe('px-4 py-2')
  })

  it('应该解决 Tailwind 冲突', () => {
    // padding 冲突：px-2 应该被 px-4 覆盖
    const result = cn('px-2', 'px-4')
    expect(result).toContain('px-4')
    expect(result).not.toContain('px-2')
  })

  it('应该处理条件类', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('应该处理数组输入', () => {
    const result = cn(['px-4', 'py-2'], 'text-black')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('text-black')
  })

  it('应该处理对象 class 映射', () => {
    const result = cn({
      'px-4': true,
      'py-2': false,
      'text-black': true,
    })
    expect(result).toContain('px-4')
    expect(result).toContain('text-black')
    expect(result).not.toContain('py-2')
  })

  it('应该返回空字符串当没有有效的 class', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('应该处理复杂的嵌套结构', () => {
    const result = cn(
      'base',
      {
        'active': true,
        'disabled': false,
      },
      ['px-4', 'py-2'],
      'text-black'
    )
    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('text-black')
  })

  it('应该保持空格分隔的多个类', () => {
    const result = cn('px-4 py-2', 'text-black text-lg')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('text-black')
    expect(result).toContain('text-lg')
  })
})
