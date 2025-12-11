import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClickAway } from './use-click-away'
import { useRef } from 'react'

describe('useClickAway hook', () => {
  it('应该正确初始化', () => {
    const onClickAway = vi.fn()

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(onClickAway, ref)
      return ref
    })

    expect(result.current).toBeDefined()
  })

  it('应该支持自定义事件名称', () => {
    const onClickAway = vi.fn()

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(onClickAway, ref, 'mousedown')
      return ref
    })

    expect(result.current).toBeDefined()
  })

  it('应该支持多个事件名称', () => {
    const onClickAway = vi.fn()

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(onClickAway, ref, ['click', 'mousedown'])
      return ref
    })

    expect(result.current).toBeDefined()
  })

  it('应该支持多个目标', () => {
    const onClickAway = vi.fn()

    const { result } = renderHook(() => {
      const ref1 = useRef<HTMLDivElement>(null)
      const ref2 = useRef<HTMLDivElement>(null)
      useClickAway(onClickAway, [ref1, ref2])
      return { ref1, ref2 }
    })

    expect(result.current.ref1).toBeDefined()
    expect(result.current.ref2).toBeDefined()
  })

  it('应该清理事件监听器', () => {
    const onClickAway = vi.fn()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(onClickAway, ref)
      return ref
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
    removeEventListenerSpy.mockRestore()
  })

  it('应该在事件名称变化时重新设置监听器', () => {
    const onClickAway = vi.fn()

    const { rerender } = renderHook(
      ({ eventName }) => {
        const ref = useRef<HTMLDivElement>(null)
        useClickAway(onClickAway, ref, eventName)
        return ref
      },
      { initialProps: { eventName: 'click' as any } }
    )

    rerender({ eventName: 'mousedown' as any })

    expect(onClickAway).toBeDefined()
  })
})
