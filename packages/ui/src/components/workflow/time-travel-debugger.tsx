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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select'
import { Slider } from '@sker/ui/components/ui/slider'
import { ScrollArea } from '@sker/ui/components/ui/scroll-area'

/**
 * 节点事件类型，工作流也是一个节点
 */
export type TimeTravelEvent<T = any> =
  | NodeRuningEvent
  | NodeEmitEvent<T>
  | NodeSuccessEvent
  | NodeFailEvent
  | NodeDeltaEvent
  | NodeProgressEvent;

// 节点运行
export interface NodeRuningEvent {
  type: 'node_runing';
  id: string;
}
// 节点发射
export interface NodeEmitEvent<T = any> {
  type: 'node_emit';
  id: string;
  data: Partial<T>;
}
// 节点成功
export interface NodeSuccessEvent<T = any> {
  type: 'node_success';
  id: string;
}
// 节点失败
export interface NodeFailEvent {
  type: 'node_fail';
  id: string;
  error: string | undefined;
}
// 节点增量输出（流式）
export interface NodeDeltaEvent {
  type: 'node_delta';
  id: string;
  data: {
    delta: string;
    accumulated?: string;
    [key: string]: any;
  };
}
// 节点进度（工具调用、阶段性任务）
export interface NodeProgressEvent {
  type: 'node_progress';
  id: string;
  data: {
    round?: number;
    status?: 'executing' | 'completed';
    [key: string]: any;
  };
}

/**
 * 时间旅行调试器 Props
 */
export interface TimeTravelDebuggerProps {
  /** 事件列表 */
  events: TimeTravelEvent[]
  /** 当前事件索引 */
  currentIndex: number
  /** 总事件数 */
  totalEvents: number
  /** 当前事件 */
  currentEvent: TimeTravelEvent | null
  /** 是否正在回放 */
  isReplaying: boolean
  /** 回放速度 */
  replaySpeed: number

  // 控制回调
  /** 跳转到指定事件 */
  onJumpTo: (index: number) => void
  /** 后退一步 */
  onStepBackward: () => void
  /** 前进一步 */
  onStepForward: () => void
  /** 跳至起点 */
  onJumpToStart: () => void
  /** 跳至终点 */
  onJumpToEnd: () => void
  /** 自动回放 */
  onAutoReplay: () => void
  /** 暂停回放 */
  onPauseReplay: () => void
  /** 设置回放速度 */
  onSetReplaySpeed: (speed: number) => void
  /** 清空所有事件 */
  onClear: () => void
  /** 定位到节点 */
  onLocateNode?: (nodeId: string) => void

  /** 自定义样式 */
  className?: string
}

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
  events,
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

  // 获取事件类型中文名称
  const getEventTypeLabel = useCallback((type: TimeTravelEvent['type']) => {
    const labels = {
      node_success: '成功',
      node_fail: '失败',
      node_runing: '运行中',
      node_emit: '发射数据',
      node_delta: '流式输出',
      node_progress: '执行进度',
    }
    return labels[type] || '未知'
  }, [])

  // 获取事件类型颜色
  const getEventTypeColor = useCallback((type: TimeTravelEvent['type']) => {
    const colors = {
      node_success: 'text-green-600 dark:text-green-400',
      node_fail: 'text-destructive',
      node_runing: 'text-blue-600 dark:text-blue-400',
      node_emit: 'text-purple-600 dark:text-purple-400',
      node_delta: 'text-yellow-600 dark:text-yellow-400',
      node_progress: 'text-orange-600 dark:text-orange-400',
    }
    return colors[type] || 'text-muted-foreground'
  }, [])

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

  // 定位到当前节点
  const handleLocateCurrentNode = useCallback(() => {
    if (currentEvent?.id && onLocateNode) {
      onLocateNode(currentEvent.id)
    }
  }, [currentEvent, onLocateNode])

  // 格式化 JSON 数据
  const formattedData = useMemo(() => {
    if (!currentEvent) return null
    return JSON.stringify(currentEvent, null, 2)
  }, [currentEvent])

  const renderData = (currentEvent: TimeTravelEvent) => {
    switch (currentEvent.type) {
      case 'node_delta':
        return currentEvent.data.accumulated;
      case 'node_emit':
        return JSON.stringify(currentEvent.data).substring(0, 80);
      case 'node_fail':
        return currentEvent.error || '未知错误';
      case 'node_progress':
        return currentEvent.data.message;
      case 'node_runing':
        return `开始运行`;
      case 'node_success':
        return `运行成功`;
      default:
        return `未知类型`
    }
  }

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
          <div className="flex items-center gap-4 text-xs border-t border-border pt-3 min-h-[32px] flex-shrink-0 flex-wrap">
            {/* 事件类型 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">状态:</span>
              <span className={cn('font-semibold', getEventTypeColor(currentEvent.type))}>
                {getEventTypeLabel(currentEvent.type)}
              </span>
            </div>

            {/* 节点信息 */}
            {currentEvent.id && (
              <>
                <div className="h-3 w-px bg-border flex-shrink-0" />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted-foreground">节点:</span>
                  {onLocateNode ? (
                    <button
                      onClick={handleLocateCurrentNode}
                      className="font-mono font-semibold text-foreground hover:text-primary hover:underline cursor-pointer"
                    >
                      {currentEvent.id.substring(0, 8)}...
                    </button>
                  ) : (
                    <span className="font-mono font-semibold text-foreground">
                      {currentEvent.id.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </>
            )}

            {/* 回放状态 */}
            {isReplaying && (
              <>
                <div className="h-3 w-px bg-border flex-shrink-0" />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>正在回放 ({replaySpeed}x)</span>
                </div>
              </>
            )}

            {/* 数据预览 - 可滚动 */}
            {currentEvent && (
              <>
                <div className="h-3 w-px bg-border flex-shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">数据:</span>
                  <span className="font-mono text-foreground truncate text-[11px]">
                    {renderData(currentEvent)}
                  </span>
                </div>
              </>
            )}

            {/* 展开/收起按钮 */}
            {currentEvent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? '收起' : '展开查看完整数据'}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 展开区域：完整数据查看 */}
      {isExpanded && (
        <div className="border-t border-border px-6 py-4 flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">完整数据</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (formattedData) {
                  navigator.clipboard.writeText(formattedData)
                }
              }}
              className="h-6 text-xs"
            >
              复制
            </Button>
          </div>
          <ScrollArea className="h-[280px] rounded-md border border-border bg-muted/30">
            <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {formattedData}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

TimeTravelDebugger.displayName = 'TimeTravelDebugger'
