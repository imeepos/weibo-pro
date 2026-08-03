'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Play,
  Pause,
  Trash2,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select'
import { Slider } from '@sker/ui/components/ui/slider'

import { TimeTravelDataPanel } from './time-travel-data-panel.js'
import { TimeTravelEventInfo } from './time-travel-event-info.js'
import type { TimeTravelDebuggerProps } from './time-travel-events.js'

export type {
  TimeTravelEvent,
  TimeTravelDebuggerProps,
  NodeRuningEvent,
  NodeEmitEvent,
  NodeSuccessEvent,
  NodeFailEvent,
  NodeDeltaEvent,
  NodeProgressEvent,
} from './time-travel-events.js'

/**
 * 时间旅行调试器 - 纯 UI 组件
 *
 * 设计理念：
 * - 固定宽度：w-[900px]，避免内容变化导致的抖动
 * - 展开功能：支持展开查看完整数据
 * - 多主题：使用 CSS Variables，适配明暗主题
 * - 纯展示：不包含业务逻辑，所有状态由外部管理
 */
export const TimeTravelDebugger: React.FC<TimeTravelDebuggerProps> = ({
  events: _events,
  currentIndex,
  totalEvents,
  currentEvent,
  isReplaying,
  replaySpeed,
  onJumpTo,
  onStepBackward,
  onStepForward,
  onJumpToStart,
  onJumpToEnd,
  onAutoReplay,
  onPauseReplay,
  onSetReplaySpeed,
  onClear,
  onLocateNode,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const disabled = totalEvents === 0

  // 缓存 Slider 值
  const sliderValue = useMemo(() => [currentIndex], [currentIndex])

  // Slider 变化处理
  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (value[0] !== undefined) {
        onJumpTo(value[0])
      }
    },
    [onJumpTo]
  )

  // 格式化 JSON 数据
  const formattedData = useMemo(() => {
    if (!currentEvent) return null
    return JSON.stringify(currentEvent, null, 2)
  }, [currentEvent])

  const toggleExpand = useCallback(() => {
    setIsExpanded((expanded) => !expanded)
  }, [])

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-card/95 backdrop-blur-sm',
        'border border-border rounded-lg shadow-lg',
        'w-[900px]',
        isExpanded ? 'max-h-[500px]' : '',
        'transition-all duration-200',
        className
      )}
    >
      {/* 主控制区域 - 自适应高度 */}
      <div className="flex flex-col gap-3 px-6 py-4 flex-shrink-0">
        {/* 第一行：播放控制 + 时间轴 */}
        <div className="flex items-center gap-6 h-8">
          {/* 播放控制 */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

            <div className="h-4 w-px bg-border mx-2" />

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

            <div className="h-4 w-px bg-border mx-2" />

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

          {/* 分隔线 */}
          <div className="h-8 w-px bg-border flex-shrink-0" />

          {/* 时间轴 */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-1">
              <Slider
                value={sliderValue}
                max={Math.max(totalEvents - 1, 0)}
                min={0}
                step={1}
                onValueChange={handleSliderChange}
                disabled={disabled}
              />
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {totalEvents > 0 ? (
                <span>
                  #{currentIndex + 1} / {totalEvents}
                </span>
              ) : (
                <span>无事件</span>
              )}
            </div>
          </div>
        </div>

        {/* 第二行：事件信息 - 自适应高度 */}
        {currentEvent && (
          <TimeTravelEventInfo
            currentEvent={currentEvent}
            isReplaying={isReplaying}
            replaySpeed={replaySpeed}
            isExpanded={isExpanded}
            onToggleExpand={toggleExpand}
            onLocateNode={onLocateNode}
          />
        )}
      </div>

      {/* 展开区域：完整数据查看 */}
      {isExpanded && <TimeTravelDataPanel formattedData={formattedData} />}
    </div>
  )
}

TimeTravelDebugger.displayName = 'TimeTravelDebugger'
