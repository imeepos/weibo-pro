'use client'

import React, { useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'

import { getEventTypeColor, getEventTypeLabel, renderData } from './time-travel-format.js'
import type { TimeTravelEvent } from './time-travel-events.js'

export interface TimeTravelEventInfoProps {
  currentEvent: TimeTravelEvent
  isReplaying: boolean
  replaySpeed: number
  isExpanded: boolean
  onToggleExpand: () => void
  onLocateNode?: (nodeId: string) => void
}

/** 第二行：事件信息摘要展示 */
export const TimeTravelEventInfo: React.FC<TimeTravelEventInfoProps> = ({
  currentEvent,
  isReplaying,
  replaySpeed,
  isExpanded,
  onToggleExpand,
  onLocateNode,
}) => {
  // 定位到当前节点
  const handleLocateCurrentNode = useCallback(() => {
    if (currentEvent?.id && onLocateNode) {
      onLocateNode(currentEvent.id)
    }
  }, [currentEvent, onLocateNode])

  return (
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
      <div className="h-3 w-px bg-border flex-shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">数据:</span>
        <span className="font-mono text-foreground truncate text-[11px]">
          {renderData(currentEvent)}
        </span>
      </div>

      {/* 展开/收起按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleExpand}
        title={isExpanded ? '收起' : '展开查看完整数据'}
        className="h-6 w-6 p-0 flex-shrink-0"
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
    </div>
  )
}
