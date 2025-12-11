import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBoolean } from './use-boolean'

describe('useBoolean hook', () => {
  it('should initialize with default value of false', () => {
    const { result } = renderHook(() => useBoolean())
    expect(result.current[0]).toBe(false)
  })

  it('should initialize with true', () => {
    const { result } = renderHook(() => useBoolean(true))
    expect(result.current[0]).toBe(true)
  })

  it('should set to true', () => {
    const { result } = renderHook(() => useBoolean(false))
    act(() => {
      result.current[1].setTrue()
    })
    expect(result.current[0]).toBe(true)
  })

  it('should set to false', () => {
    const { result } = renderHook(() => useBoolean(true))
    act(() => {
      result.current[1].setFalse()
    })
    expect(result.current[0]).toBe(false)
  })

  it('should toggle boolean value', () => {
    const { result } = renderHook(() => useBoolean(false))
    expect(result.current[0]).toBe(false)

    act(() => {
      result.current[1].toggle()
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1].toggle()
    })
    expect(result.current[0]).toBe(false)
  })

  it('should set to specific value', () => {
    const { result } = renderHook(() => useBoolean(false))

    act(() => {
      result.current[1].set(true)
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1].set(false)
    })
    expect(result.current[0]).toBe(false)
  })

  it('should handle multiple operations', () => {
    const { result } = renderHook(() => useBoolean(false))

    act(() => {
      result.current[1].setTrue()
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1].toggle()
    })
    expect(result.current[0]).toBe(false)

    act(() => {
      result.current[1].set(true)
    })
    expect(result.current[0]).toBe(true)
  })
})
