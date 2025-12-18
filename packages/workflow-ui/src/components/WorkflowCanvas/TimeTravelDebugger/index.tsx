import React, { useMemo, useCallback } from 'react'
import { TimeTravelDebugger as TimeTravelDebuggerUI, TimeTravelEvent } from '@sker/ui/components/workflow'
import { TimeTravelState, TimeTravelActions } from '../../../hooks/useTimeTravel'
import { NodeEvent } from '@sker/workflow'

/**
 * 时间旅行调试器 - 业务逻辑层
 *
 * 职责：
 * - 适配 @sker/workflow 的 NodeEvent 到 UI 层的 TimeTravelEvent
 * - 处理业务逻辑（节点定位等）
 * - 调用纯 UI 组件进行渲染
 */
export interface TimeTravelDebuggerProps extends TimeTravelState, TimeTravelActions {
  className?: string
  onLocateNode?: (nodeId: string) => void
}

export const TimeTravelDebugger: React.FC<TimeTravelDebuggerProps> = React.memo(({
  events,
  currentIndex,
  totalEvents,
  isReplaying,
  replaySpeed,
  currentEvent,
  jumpTo,
  stepForward,
  stepBackward,
  jumpToStart,
  jumpToEnd,
  autoReplay,
  pauseReplay,
  setReplaySpeed,
  clear,
  className,
  onLocateNode,
}) => {
  // 将 NodeEvent[] 转换为 TimeTravelEvent[]
  const timeTravelEvents = useMemo<TimeTravelEvent[]>(() => {
    return events.map((event: NodeEvent) => ({
      id: event.id,
      type: event.type,
      timestamp: Date.now(), // NodeEvent 没有 timestamp，使用当前时间
      data: 'data' in event ? event.data : undefined,
    }))
  }, [events])

  // 将当前 NodeEvent 转换为 TimeTravelEvent
  const currentTimeTravelEvent = useMemo<TimeTravelEvent | null>(() => {
    if (!currentEvent) return null
    return {
      id: currentEvent.id,
      type: currentEvent.type,
      timestamp: Date.now(),
      data: 'data' in currentEvent ? currentEvent.data : undefined,
    }
  }, [currentEvent])

  return (
    <TimeTravelDebuggerUI
      events={timeTravelEvents}
      currentIndex={currentIndex}
      totalEvents={totalEvents}
      currentEvent={currentTimeTravelEvent}
      isReplaying={isReplaying}
      replaySpeed={replaySpeed}
      onJumpTo={jumpTo}
      onStepBackward={stepBackward}
      onStepForward={stepForward}
      onJumpToStart={jumpToStart}
      onJumpToEnd={jumpToEnd}
      onAutoReplay={autoReplay}
      onPauseReplay={pauseReplay}
      onSetReplaySpeed={setReplaySpeed}
      onClear={clear}
      onLocateNode={onLocateNode}
      className={className}
    />
  )
})

TimeTravelDebugger.displayName = 'TimeTravelDebugger'
