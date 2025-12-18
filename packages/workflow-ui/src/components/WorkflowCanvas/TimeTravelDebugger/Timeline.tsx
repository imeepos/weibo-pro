import React, { useCallback, useMemo } from 'react'
import { NodeEvent } from '@sker/workflow'
import { Slider } from '@sker/ui/components/ui/slider'
import { EventMarker } from './EventMarker'
import { cn } from '../../../utils/cn'

/**
 * 时间轴组件
 *
 * 设计哲学：
 * - 存在即合理：时间轴是时间旅行的视觉化载体
 * - 优雅即简约：Slider + 事件标记点，简洁而信息丰富
 * - 性能即艺术：虚拟化渲染（仅渲染可见标记点）
 */
export interface TimelineProps {
  events: NodeEvent[]
  currentIndex: number
  totalEvents: number
  onJumpTo: (index: number) => void
  className?: string
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  currentIndex,
  totalEvents,
  onJumpTo,
  className,
}) => {
  // 缓存 Slider 的 value 数组，避免每次渲染创建新引用
  const sliderValue = useMemo(() => [currentIndex], [currentIndex])

  // 处理滑块变化
  const handleValueChange = useCallback(
    (value: number[]) => {
      if (value[0] !== undefined) {
        onJumpTo(value[0])
      }
    },
    [onJumpTo]
  )

  // 缓存事件标记点，避免频繁重计算
  const markerEvents = useMemo(() => {
    if (totalEvents === 0) return []

    // 如果事件少于 50 个，显示所有事件
    if (totalEvents <= 50) {
      return events.map((event, index) => ({
        event,
        index,
        position: (index / Math.max(totalEvents - 1, 1)) * 100,
      }))
    }

    // 否则只显示关键事件（success, fail）+ 当前事件
    return events
      .map((event, index) => ({
        event,
        index,
        position: (index / Math.max(totalEvents - 1, 1)) * 100,
      }))
      .filter(
        ({ event, index }) =>
          event.type === 'node_success' ||
          event.type === 'node_fail' ||
          index === currentIndex
      )
  }, [events, totalEvents, currentIndex])

  return (
    <div className={cn('relative flex items-center gap-6', className)}>
      {/* 时间轴滑块 */}
      <div className="relative flex-1 min-w-[420px]">
        <Slider
          value={sliderValue}
          max={Math.max(totalEvents - 1, 0)}
          min={0}
          step={1}
          onValueChange={handleValueChange}
          className="w-full"
          disabled={totalEvents === 0}
        />

        {/* 事件标记点 */}
        <div className="absolute inset-0 pointer-events-none">
          {markerEvents.map(({ event, index, position }) => (
            <EventMarker
              key={`${event.id}-${event.type}-${index}`}
              event={event}
              position={position}
              isCurrent={index === currentIndex}
              onClick={() => onJumpTo(index)}
            />
          ))}
        </div>
      </div>

      {/* 事件计数器 */}
      <div className="text-xs text-muted-foreground whitespace-nowrap min-w-[120px]">
        {totalEvents > 0 ? (
          <span>
            事件 <span className="font-mono font-semibold text-foreground">#{currentIndex + 1}</span> / {totalEvents}
          </span>
        ) : (
          <span className="text-muted-foreground/60">无事件记录</span>
        )}
      </div>
    </div>
  )
}
