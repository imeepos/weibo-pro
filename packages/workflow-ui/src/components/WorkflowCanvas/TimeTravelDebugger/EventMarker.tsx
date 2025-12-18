import React from 'react'
import { NodeEvent } from '@sker/workflow'
import { cn } from '../../../utils/cn'

/**
 * 事件标记点组件
 *
 * 设计哲学：
 * - 存在即合理：每个颜色都对应一个事件状态
 * - 优雅即简约：最小化的视觉元素，最大化的信息密度
 */
export interface EventMarkerProps {
  event: NodeEvent
  position: number // 在时间轴上的位置（百分比 0-100）
  isCurrent?: boolean
  onClick?: () => void
}

export const EventMarker: React.FC<EventMarkerProps> = React.memo(({
  event,
  position,
  isCurrent = false,
  onClick,
}) => {
  // 根据事件类型确定颜色
  const getMarkerColor = () => {
    switch (event.type) {
      case 'node_success':
        return 'bg-green-500 shadow-green-500/50'
      case 'node_fail':
        return 'bg-red-500 shadow-red-500/50'
      case 'node_runing':
        return 'bg-blue-500 shadow-blue-500/50 animate-pulse'
      case 'node_emit':
        return 'bg-cyan-500 shadow-cyan-500/50'
      default:
        return 'bg-gray-500 shadow-gray-500/50'
    }
  }

  // 事件类型中文名称
  const getEventTypeLabel = () => {
    switch (event.type) {
      case 'node_success':
        return '成功'
      case 'node_fail':
        return '失败'
      case 'node_runing':
        return '运行中'
      case 'node_emit':
        return '发射数据'
      default:
        return '未知'
    }
  }

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
      style={{ left: `${position}%` }}
      onClick={onClick}
    >
      {/* 标记点 */}
      <div
        className={cn(
          'w-2 h-2 rounded-full cursor-pointer transition-all',
          'hover:scale-150 hover:shadow-lg',
          isCurrent && 'scale-150 ring-2 ring-white',
          getMarkerColor()
        )}
      />

      {/* Tooltip */}
      <div
        className={cn(
          'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
          'px-3 py-2 bg-popover text-popover-foreground',
          'border border-border rounded-md shadow-md',
          'text-xs whitespace-nowrap',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'pointer-events-none z-50'
        )}
      >
        <div className="space-y-1">
          <div className="font-semibold">事件类型: {getEventTypeLabel()}</div>
          {event.id && (
            <div className="text-muted-foreground">节点 ID: {event.id}</div>
          )}
          {event.type === 'node_emit' && event.data && (
            <div className="text-muted-foreground max-w-xs truncate">
              数据: {JSON.stringify(event.data).substring(0, 50)}...
            </div>
          )}
        </div>
        {/* 箭头 */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-popover" />
      </div>
    </div>
  )
})
