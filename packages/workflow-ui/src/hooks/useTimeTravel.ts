import { useEffect, useState, useCallback, useRef } from 'react'
import { Subscription } from 'rxjs'
import { globalRuntime, WorkflowEventStream, NodeEvent } from '@sker/workflow'

/**
 * 时间旅行 Hook（重构后）
 *
 * 设计哲学：
 * - **存在即合理**：每个状态都服务于明确的调试需求
 * - **优雅即简约**：直接订阅全局 eventStream，无需 runId 查找
 * - **性能即艺术**：RxJS 订阅自动管理，无内存泄漏
 * - **业界最佳实践**：借鉴 Redux DevTools 设计
 */
export interface TimeTravelState {
  eventStream: WorkflowEventStream
  events: NodeEvent[]
  currentIndex: number
  totalEvents: number
  isReplaying: boolean
  replaySpeed: number
  currentEvent: NodeEvent | null
  isTimeTravelMode: boolean
}

export interface TimeTravelActions {
  jumpTo: (index: number) => void
  stepForward: () => void
  stepBackward: () => void
  jumpToStart: () => void
  jumpToEnd: () => void
  autoReplay: () => void
  pauseReplay: () => void
  setReplaySpeed: (speed: number) => void
  clear: () => void
}

export function useTimeTravel(): TimeTravelState & TimeTravelActions {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [events, setEvents] = useState<NodeEvent[]>([])
  const [isReplaying, setIsReplaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)

  const replaySubscriptionRef = useRef<Subscription | null>(null)
  const eventStream = globalRuntime.events

  // 订阅全局 eventStream（永远不需要改变）
  useEffect(() => {
    // 订阅可见事件
    const eventsSub = eventStream.visibleEvents$.subscribe(visibleEvents => {
      setEvents(visibleEvents)

      // 同时更新当前索引（基于可见事件的长度）
      const isReplaying = eventStream.isReplaying
      if (isReplaying) {
        setCurrentIndex(visibleEvents.length - 1)
      } else {
        // 实时模式，使用总事件数
        const totalEvents = eventStream.events.length
        setCurrentIndex(totalEvents > 0 ? totalEvents - 1 : 0)
      }
    })
    return () => {
      eventsSub.unsubscribe()
    }
  }, []) // 空依赖数组：永远不需要改变

  // 跳转到指定索引
  const jumpTo = useCallback((index: number) => {
    eventStream.jumpTo(index)
  }, [eventStream])

  // 前进一步
  const stepForward = useCallback(() => {
    eventStream.stepForward()
  }, [eventStream])

  // 后退一步
  const stepBackward = useCallback(() => {
    eventStream.stepBackward()
  }, [eventStream])

  // 跳转到起点
  const jumpToStart = useCallback(() => {
    eventStream.jumpToStart()
  }, [eventStream])

  // 跳转到终点（实时模式）
  const jumpToEnd = useCallback(() => {
    eventStream.jumpToEnd()
  }, [eventStream])

  // 自动回放
  const autoReplay = useCallback(() => {
    // 如果已经在回放，先停止
    if (replaySubscriptionRef.current) {
      replaySubscriptionRef.current.unsubscribe()
      replaySubscriptionRef.current = null
    }

    setIsReplaying(true)

    // 速度映射：1x=200ms, 2x=100ms, 5x=40ms, 10x=20ms
    const speedMap: Record<number, number> = { 0.5: 400, 1: 200, 2: 100, 5: 40, 10: 20 }
    const delayMs = speedMap[replaySpeed] || 200

    const sub = eventStream.autoReplay$(delayMs).subscribe({
      complete: () => {
        setIsReplaying(false)
        replaySubscriptionRef.current = null
      },
      error: () => {
        setIsReplaying(false)
        replaySubscriptionRef.current = null
      }
    })

    replaySubscriptionRef.current = sub
  }, [eventStream, replaySpeed])

  // 暂停回放
  const pauseReplay = useCallback(() => {
    if (replaySubscriptionRef.current) {
      replaySubscriptionRef.current.unsubscribe()
      replaySubscriptionRef.current = null
      setIsReplaying(false)
    }
  }, [])

  // 清空事件
  const clear = useCallback(() => {
    eventStream.clear()
  }, [eventStream])

  // 清理订阅
  useEffect(() => {
    return () => {
      if (replaySubscriptionRef.current) {
        replaySubscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  // 计算当前事件
  const currentEvent = events[currentIndex] || null

  // 是否处于时间旅行模式（回放索引 >= 0）
  const isTimeTravelMode = eventStream.isReplaying

  return {
    // 状态
    eventStream,
    events,
    currentIndex,
    totalEvents: events.length,
    isReplaying,
    replaySpeed,
    currentEvent,
    isTimeTravelMode,

    // 操作
    jumpTo,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    autoReplay,
    pauseReplay,
    setReplaySpeed,
    clear,
  }
}
