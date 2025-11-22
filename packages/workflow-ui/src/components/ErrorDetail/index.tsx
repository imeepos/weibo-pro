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

import React from 'react'
import type { SerializedError } from '@sker/core'

interface ErrorDetailPanelProps {
  error: SerializedError
  depth?: number
}

export const ErrorDetailPanel = ({ error, depth = 0 }: ErrorDetailPanelProps) => {

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
    </div>
  )
}
