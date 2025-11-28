import React from 'react'
import { PlusSquare } from 'lucide-react'

export interface CanvasEmptyStateProps {
  className?: string
}

/**
 * 画布空状态组件
 *
 * 优雅设计：
 * - 纯粹的UI组件，只负责渲染空状态提示
 * - 当画布为空时显示友好的引导信息
 * - 不包含任何业务逻辑或交互处理
 */
export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = ({
  className = ''
}) => {
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}>
      <div className="flex max-w-lg flex-col items-center gap-4 rounded-lg border-2 border-dashed border-[#3b4354] bg-[#111318]/80 px-10 py-12 text-center backdrop-blur-sm">
        <div className="rounded-full bg-[#1f2531] p-3 text-[#3b4354]">
          <PlusSquare className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold leading-tight tracking-[-0.015em]">
          工作流画布
        </h3>
        <p className="text-sm text-[#9da6b9]">
          双击画布空白区域以搜索并添加新节点。
        </p>
      </div>
    </div>
  )
}

CanvasEmptyState.displayName = 'CanvasEmptyState'