import React from 'react'
import { TimeTravelState, TimeTravelActions } from '../../../hooks/useTimeTravel'
import { Timeline } from './Timeline'
import { PlaybackControls } from './PlaybackControls'
import { cn } from '../../../utils/cn'

/**
 * 时间旅行调试器 - 主组件
 *
 * 设计哲学：
 * - 存在即合理：时间旅行是工作流调试的核心工具
 * - 优雅即简约：视频播放器式的直觉交互
 * - 性能即艺术：响应式架构，无性能损耗
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
  // 处理节点定位
  const handleLocateCurrentNode = () => {
    if (currentEvent?.id && onLocateNode) {
      onLocateNode(currentEvent.id)
    }
  }

  // 获取当前事件类型中文名称
  const getCurrentEventTypeLabel = () => {
    if (!currentEvent) return '无事件'

    switch (currentEvent.type) {
      case 'node_success':
        return '成功'
      case 'node_fail':
        return '失败'
      case 'node_runing':
        return '运行中'
      case 'node_emit':
        return '发射数据'
      case 'node_delta':
        return '流式输出'
      case 'node_progress':
        return '执行进度'
      default:
        return '未知'
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-6 py-4',
        'bg-background/95 backdrop-blur-sm',
        'border border-border rounded-lg shadow-lg',
        'min-w-[800px] max-w-[1000px]',
        className
      )}
    >
      {/* 控制栏 */}
      <div className="flex items-center gap-6">
        {/* 播放控制 */}
        <PlaybackControls
          isReplaying={isReplaying}
          replaySpeed={replaySpeed}
          totalEvents={totalEvents}
          onJumpToStart={jumpToStart}
          onStepBackward={stepBackward}
          onStepForward={stepForward}
          onJumpToEnd={jumpToEnd}
          onAutoReplay={autoReplay}
          onPauseReplay={pauseReplay}
          onSetReplaySpeed={setReplaySpeed}
          onClear={clear}
        />

        {/* 分隔线 */}
        <div className="h-8 w-px bg-border flex-shrink-0" />

        {/* 时间轴 */}
        <Timeline
          events={events}
          currentIndex={currentIndex}
          totalEvents={totalEvents}
          onJumpTo={jumpTo}
          className="flex-1"
        />
      </div>

      {/* 信息栏 */}
      {currentEvent && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
          {/* 事件类型 */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/80">状态:</span>
            <span className="font-semibold text-foreground">
              {getCurrentEventTypeLabel()}
            </span>
          </div>

          {/* 节点信息 */}
          {currentEvent.id && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/80">节点:</span>
                <button
                  onClick={handleLocateCurrentNode}
                  className="font-mono font-semibold text-foreground hover:text-primary hover:underline cursor-pointer"
                >
                  {currentEvent.id.substring(0, 8)}...
                </button>
              </div>
            </>
          )}

          {/* 回放状态 */}
          {isReplaying && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>正在回放 ({replaySpeed}x)</span>
              </div>
            </>
          )}

          {/* 数据预览 - node_emit */}
          {currentEvent.type === 'node_emit' && currentEvent.data && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground/80">数据:</span>
                <span className="font-mono text-foreground truncate text-[11px]">
                  {JSON.stringify(currentEvent.data).substring(0, 80)}...
                </span>
              </div>
            </>
          )}

          {/* 进度信息 - node_progress */}
          {currentEvent.type === 'node_progress' && (currentEvent as any).data && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground/80">进度:</span>
                <span className="text-foreground truncate text-[11px]">
                  {(currentEvent as any).data.message || (currentEvent as any).data.stage}
                </span>
              </div>
            </>
          )}

          {/* 流式输出 - node_delta */}
          {currentEvent.type === 'node_delta' && (currentEvent as any).data && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground/80">增量:</span>
                <span className="font-mono text-foreground truncate text-[11px]">
                  {((currentEvent as any).data.delta || '').substring(0, 50)}...
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
})
