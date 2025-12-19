import React from 'react'
import { TimeTravelDebugger as TimeTravelDebuggerUI } from '@sker/ui/components/workflow'
import { TimeTravelState, TimeTravelActions } from '../../../hooks/useTimeTravel'

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
  return (
    <TimeTravelDebuggerUI
      events={events}
      currentIndex={currentIndex}
      totalEvents={totalEvents}
      currentEvent={currentEvent}
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
