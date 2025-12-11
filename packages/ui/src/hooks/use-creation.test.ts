import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCreation } from './use-creation'

describe('useCreation hook', () => {
  it('应该在初始化时调用 factory 函数', () => {
    let callCount = 0
    const factory = () => {
      callCount++
      return { value: 'created' }
    }

    renderHook(() => useCreation(factory, []))
    expect(callCount).toBe(1)
  })

  it('应该缓存对象直到依赖变化', () => {
    let callCount = 0
    const factory = () => {
      callCount++
      return { value: 'created' }
    }

    const { result, rerender } = renderHook(
      ({ deps }) => useCreation(factory, deps),
      { initialProps: { deps: ['a'] } }
    )

    const firstResult = result.current
    expect(callCount).toBe(1)

    rerender({ deps: ['a'] })
    expect(result.current).toBe(firstResult)
    expect(callCount).toBe(1)
  })

  it('应该在依赖变化时重新创建对象', () => {
    let callCount = 0
    const factory = () => {
      callCount++
      return { value: `created-${callCount}` }
    }

    const { result, rerender } = renderHook(
      ({ deps }) => useCreation(factory, deps),
      { initialProps: { deps: ['a'] } }
    )

    const firstResult = result.current
    expect(callCount).toBe(1)

    rerender({ deps: ['b'] })
    expect(result.current).not.toBe(firstResult)
    expect(callCount).toBe(2)
  })

  it('应该支持空依赖数组', () => {
    let callCount = 0
    const factory = () => {
      callCount++
      return { timestamp: Date.now() }
    }

    const { result, rerender } = renderHook(
      () => useCreation(factory, []),
      { initialProps: {} }
    )

    const firstResult = result.current
    expect(callCount).toBe(1)

    rerender({})
    expect(result.current).toBe(firstResult)
    expect(callCount).toBe(1)
  })

  it('应该支持多个依赖', () => {
    let callCount = 0
    const factory = () => {
      callCount++
      return { created: true }
    }

    const { result, rerender } = renderHook(
      ({ deps }) => useCreation(factory, deps),
      { initialProps: { deps: ['a', 'b', 'c'] } }
    )

    const firstResult = result.current
    expect(callCount).toBe(1)

    rerender({ deps: ['a', 'b', 'c'] })
    expect(result.current).toBe(firstResult)

    rerender({ deps: ['a', 'b', 'd'] })
    expect(result.current).not.toBe(firstResult)
    expect(callCount).toBe(2)
  })

  it('应该返回 factory 函数的返回值', () => {
    const expectedValue = { name: 'test', count: 123 }
    const factory = () => expectedValue

    const { result } = renderHook(() => useCreation(factory, []))
    expect(result.current).toBe(expectedValue)
  })

  it('应该在每个组件实例中保持独立的对象', () => {
    const factory1 = () => ({ id: 1 })
    const factory2 = () => ({ id: 2 })

    const { result: result1 } = renderHook(() => useCreation(factory1, []))
    const { result: result2 } = renderHook(() => useCreation(factory2, []))

    expect(result1.current).not.toBe(result2.current)
    expect(result1.current).toEqual({ id: 1 })
    expect(result2.current).toEqual({ id: 2 })
  })
})
