'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowNodeProps } from './types/workflow-nodes'

export function WorkflowNode({
  id,
  type,
  data,
  selected = false,
  className,
}: WorkflowNodeProps) {
  const { label = type, status = 'idle', progress } = data

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950'
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950'
      default:
        return 'border-gray-300 bg-white dark:bg-gray-800'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return '🔄'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⚪'
    }
  }

  return (
    <div
      className={cn(
        'min-w-[120px] max-w-[200px] p-3 border-2 rounded-lg shadow-sm transition-all duration-200',
        getStatusColor(),
        selected && 'ring-2 ring-blue-500 ring-offset-2',
        className
      )}
    >
      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* 节点内容 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs">{getStatusIcon()}</span>
            <span className="font-medium text-sm truncate">{label}</span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {type}
          </span>
        </div>

        {/* 进度条 */}
        {progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  )
}