import React from 'react'
import { Button } from '@sker/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Play, Pause, Trash2 } from 'lucide-react'
import { cn } from '../../../utils/cn'

/**
 * 播放控制组件
 *
 * 设计哲学：
 * - 存在即合理：每个按钮都对应一个明确的时间旅行操作
 * - 优雅即简约：类似视频播放器的直觉交互
 */
export interface PlaybackControlsProps {
  isReplaying: boolean
  replaySpeed: number
  totalEvents: number
  onJumpToStart: () => void
  onStepBackward: () => void
  onStepForward: () => void
  onJumpToEnd: () => void
  onAutoReplay: () => void
  onPauseReplay: () => void
  onSetReplaySpeed: (speed: number) => void
  onClear: () => void
  className?: string
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isReplaying,
  replaySpeed,
  totalEvents,
  onJumpToStart,
  onStepBackward,
  onStepForward,
  onJumpToEnd,
  onAutoReplay,
  onPauseReplay,
  onSetReplaySpeed,
  onClear,
  className,
}) => {
  const disabled = totalEvents === 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 跳至起点 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onJumpToStart}
        disabled={disabled}
        title="跳至起点"
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* 后退一步 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStepBackward}
        disabled={disabled}
        title="后退一步"
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 播放/暂停 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={isReplaying ? onPauseReplay : onAutoReplay}
        disabled={disabled}
        title={isReplaying ? '暂停回放' : '自动回放'}
        className="h-8 w-8 p-0"
      >
        {isReplaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      {/* 前进一步 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onStepForward}
        disabled={disabled}
        title="前进一步"
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* 跳至终点 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onJumpToEnd}
        disabled={disabled}
        title="跳至终点（实时模式）"
        className="h-8 w-8 p-0"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-border mx-2" />

      {/* 回放速度 */}
      <Select
        value={replaySpeed.toString()}
        onValueChange={(value) => onSetReplaySpeed(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[85px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0.5">0.5x</SelectItem>
          <SelectItem value="1">1x</SelectItem>
          <SelectItem value="2">2x</SelectItem>
          <SelectItem value="5">5x</SelectItem>
          <SelectItem value="10">10x</SelectItem>
        </SelectContent>
      </Select>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-border mx-2" />

      {/* 清空事件 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={disabled}
        title="清空所有事件"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
