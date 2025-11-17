/**
 * ErrorDetailPanel - 错误详情展示组件
 *
 * 存在即合理：
 * - 结构化展示 SerializedError 的完整信息
 * - 递归显示错误链（cause）
 * - 折叠/展开复杂数据（response, stack）
 *
 * 优雅即简约：
 * - 清晰的视觉层次
 * - 人类可读的错误描述
 * - 一目了然的错误上下文
 */

import React, { useState } from 'react'
import type { SerializedError } from '@sker/core'

interface ErrorDetailPanelProps {
  error: SerializedError
  depth?: number
}

const JsonView = ({ data }: { data: any }) => {
  const [expanded, setExpanded] = useState(false)

  if (!data || typeof data !== 'object') {
    return <span className="text-slate-300">{String(data)}</span>
  }

  const json = JSON.stringify(data, null, 2)
  const preview = JSON.stringify(data)
  const isTooLong = preview.length > 60

  return (
    <div className="space-y-1">
      {isTooLong ? (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span className="transform transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            {expanded ? '收起' : '展开'}
          </button>
          {expanded && (
            <pre className="text-xs text-slate-300 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700 overflow-x-auto">
              {json}
            </pre>
          )}
          {!expanded && (
            <div className="text-xs text-slate-400 font-mono truncate">
              {preview.slice(0, 60)}...
            </div>
          )}
        </>
      ) : (
        <pre className="text-xs text-slate-300 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
          {json}
        </pre>
      )}
    </div>
  )
}

const ErrorCauseChain = ({ cause, depth = 1 }: { cause: SerializedError; depth?: number }) => {
  return (
    <div className="mt-2 pl-4 border-l-2 border-orange-500/30 space-y-2">
      <div className="text-xs text-orange-400 font-medium">
        {depth === 1 ? '原因' : `第 ${depth} 层原因`}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-400">类型:</span>
          <span className="text-xs text-orange-300 font-mono">{cause.name}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-400">信息:</span>
          <span className="text-xs text-slate-200">{cause.message}</span>
        </div>
        {cause.type && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">错误类型:</span>
            <span className="text-xs text-yellow-300 font-mono">{cause.type}</span>
          </div>
        )}
        {cause.statusCode !== undefined && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">HTTP 状态:</span>
            <span className="text-xs text-blue-300 font-mono">{cause.statusCode}</span>
          </div>
        )}
        {cause.response && (
          <div className="space-y-1">
            <span className="text-xs text-slate-400">响应数据:</span>
            <JsonView data={cause.response} />
          </div>
        )}
      </div>
      {cause.cause && <ErrorCauseChain cause={cause.cause} depth={depth + 1} />}
    </div>
  )
}

export const ErrorDetailPanel = ({ error, depth = 0 }: ErrorDetailPanelProps) => {
  const [showStack, setShowStack] = useState(false)

  if (!error) {
    return null
  }

  return (
    <div className="space-y-3 text-xs">
      {/* 主要错误信息 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-red-400">{error.name}</span>
        </div>

        <div className="bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
          <p className="text-sm text-red-200 leading-relaxed">{error.message}</p>
        </div>
      </div>

      {/* 错误上下文 */}
      <div className="space-y-1.5">
        {error.type && (
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400">错误类型:</span>
            <span className="text-yellow-300 font-mono">{error.type}</span>
          </div>
        )}
        {error.statusCode !== undefined && (
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400">HTTP 状态:</span>
            <span className="text-blue-300 font-mono">{error.statusCode}</span>
          </div>
        )}
        {error.response && (
          <div className="space-y-1">
            <span className="text-slate-400">响应数据:</span>
            <JsonView data={error.response} />
          </div>
        )}
      </div>

      {/* 错误链 */}
      {error.cause && (
        <div className="pt-2 border-t border-slate-700/50">
          <ErrorCauseChain cause={error.cause} />
        </div>
      )}

      {/* 堆栈跟踪（可选） */}
      {error.stack && (
        <div className="pt-2 border-t border-slate-700/50 space-y-2">
          <button
            onClick={() => setShowStack(!showStack)}
            className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
          >
            <span className="transform transition-transform" style={{ transform: showStack ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            {showStack ? '隐藏' : '显示'}堆栈跟踪
          </button>
          {showStack && (
            <pre className="text-xs text-slate-400 font-mono bg-slate-900/50 px-3 py-2 rounded border border-slate-700 overflow-x-auto max-h-48 overflow-y-auto">
              {error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
