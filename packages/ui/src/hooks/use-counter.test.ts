import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './use-counter'

describe('useCounter hook', () => {
  it('should initialize with default value of 0', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current[0]).toBe(0)
  })

  it('should initialize with custom value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current[0]).toBe(10)
  })

  it('should increment the counter', () => {
    const { result } = renderHook(() => useCounter(0))
    act(() => {
      result.current[1].inc()
    })
    expect(result.current[0]).toBe(1)
  })

  it('should decrement the counter', () => {
    const { result } = renderHook(() => useCounter(5))
    act(() => {
      result.current[1].dec()
    })
    expect(result.current[0]).toBe(4)
  })

  it('should set counter to specific value', () => {
    const { result } = renderHook(() => useCounter(0))
    act(() => {
      result.current[1].set(42)
    })
    expect(result.current[0]).toBe(42)
  })

  it('should set counter with function', () => {
    const { result } = renderHook(() => useCounter(10))
    act(() => {
      result.current[1].set((prev) => prev * 2)
    })
    expect(result.current[0]).toBe(20)
  })

  it('should reset counter to initial value', () => {
    const { result } = renderHook(() => useCounter(5))
    act(() => {
      result.current[1].inc()
      result.current[1].inc()
    })
    expect(result.current[0]).toBe(7)

    act(() => {
      result.current[1].reset()
    })
    expect(result.current[0]).toBe(5)
  })

  it('should handle multiple operations', () => {
    const { result } = renderHook(() => useCounter(0))

    act(() => {
      result.current[1].inc()
      result.current[1].inc()
      result.current[1].inc()
    })
    expect(result.current[0]).toBe(3)

    act(() => {
      result.current[1].dec()
    })
    expect(result.current[0]).toBe(2)

    act(() => {
      result.current[1].set(0)
    })
    expect(result.current[0]).toBe(0)
  })
})
