'use client'

import React, { useState } from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { cn } from '../../utils/cn'
import { X, Workflow, Settings, History } from 'lucide-react'
import { useSelectedNode } from '../PropertyPanel/useSelectedNode'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'

export interface LeftDrawerProps {
  visible: boolean
  onClose: () => void
  className?: string
}

type TabType = 'settings' | 'history'

export function LeftDrawer({ visible, onClose, className = '' }: LeftDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [width, setWidth] = useState(420)
  const selectedNode = useSelectedNode()

  const metadata = selectedNode ? getNodeMetadata(resolveConstructor(selectedNode.data)) : null

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      setWidth(Math.max(320, Math.min(800, startWidth + delta)))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 top-16 z-10',
        'bg-slate-900/95 backdrop-blur-sm',
        'border-[0.5px] border-slate-700/50',
        'rounded-2xl shadow-2xl',
        'flex flex-col overflow-hidden',
        'transition-opacity duration-300',
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* 调整大小控制柄 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group hover:bg-indigo-500/30 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-0 w-0.5 bg-slate-700/50 group-hover:bg-indigo-500 transition-colors" />
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 图标 */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>

          {/* 标题 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-100 truncate">
              {metadata?.label || '节点属性'}
            </h2>
            {metadata && (
              <p className="text-xs text-slate-400 truncate">
                {metadata.type}
              </p>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg',
            'flex items-center justify-center',
            'text-slate-400 hover:text-slate-100',
            'hover:bg-slate-800/50 active:bg-slate-700/50',
            'transition-colors'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold',
            'transition-all duration-200',
            'flex items-center gap-2',
            activeTab === 'settings'
              ? 'bg-slate-800/50 text-slate-100 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
          )}
        >
          <Settings className="w-4 h-4" />
          设置
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold',
            'transition-all duration-200',
            'flex items-center gap-2',
            activeTab === 'history'
              ? 'bg-slate-800/50 text-slate-100 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
          )}
        >
          <History className="w-4 h-4" />
          历史
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'settings' ? (
          <PropertyPanel />
        ) : (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-sm font-medium text-slate-400">暂无历史记录</p>
            <p className="text-xs text-slate-500 mt-2">节点执行历史将显示在这里</p>
          </div>
        )}
      </div>
    </div>
  )
}
