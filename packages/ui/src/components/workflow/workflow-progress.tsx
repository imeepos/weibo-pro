'use client'

import React, { useMemo } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'
import { Progress } from '@sker/ui/components/ui/progress'

export interface WorkflowProgressProps {
  /** 是否正在运行 */
  isRunning: boolean
  /** 总节点数 */
  totalNodes: number
  /** 已完成节点数（success + fail） */
  completedNodes: number
  /** 当前执行中的节点名 */
  currentNodeName?: string
  /** 失败节点数 */
  failedNodes?: number
  /** 取消回调 */
  onCancel?: () => void
  /** 样式类名 */
  className?: string
}

/**
 * 工作流执行进度条
 *
 * 设计理念：
 * - 底部居中悬浮，不遮挡操作区域
 * - 信息密度适中：节点名 + 进度 + 取消
 * - 动画流畅，状态清晰
 */
export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  isRunning,
  totalNodes,
  completedNodes,
  currentNodeName,
  failedNodes = 0,
  onCancel,
  className,
}) => {
  const progress = useMemo(() => {
    if (totalNodes === 0) return 0
    return Math.round((completedNodes / totalNodes) * 100)
  }, [totalNodes, completedNodes])

  if (!isRunning) return null

  return (
    <div
      className={cn(
        'absolute bottom-6 left-1/2 -translate-x-1/2 z-[10]',
        'flex items-center gap-3 px-4 py-2.5',
        'rounded-xl border border-border bg-card/95 backdrop-blur-sm',
        'shadow-lg shadow-black/20 dark:shadow-black/40',
        'animate-in fade-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      {/* 加载指示器 */}
      <Loader2 className="h-4 w-4 animate-spin text-primary" />

      {/* 节点名 */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate max-w-[160px]">
            {currentNodeName || '准备中...'}
          </span>
          <span className="text-foreground font-medium ml-2">
            {progress}%
          </span>
        </div>

        {/* 进度条 */}
        <Progress
          value={progress}
          className="h-1.5 w-[180px]"
        />
      </div>

      {/* 统计 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-3">
        <span>{completedNodes}/{totalNodes}</span>
        {failedNodes > 0 && (
          <span className="text-destructive">({failedNodes} 失败)</span>
        )}
      </div>

      {/* 取消按钮 */}
      {onCancel && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          title="取消执行"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

WorkflowProgress.displayName = 'WorkflowProgress'
