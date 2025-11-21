'use client'

import React, { useState, useEffect } from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { cn } from '../../utils/cn'
import { X, Workflow, Settings, History, Play, Crosshair } from 'lucide-react'
import { useSelectedNode } from '../PropertyPanel/useSelectedNode'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'

export interface LeftDrawerProps {
  visible: boolean
  onClose: () => void
  onRunNode?: (nodeId: string) => void
  onLocateNode?: (nodeId: string) => void
  className?: string
}

type TabType = 'settings' | 'history'

export function LeftDrawer({ visible, onClose, onRunNode, onLocateNode, className = '' }: LeftDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [width, setWidth] = useState(420)
  const selectedNode = useSelectedNode()
  const metadata = selectedNode ? getNodeMetadata(resolveConstructor(selectedNode.data)) : null

  // 当未选中任何节点时，自动关闭抽屉
  useEffect(() => {
    if (visible && !selectedNode) {
      onClose()
    }
  }, [selectedNode, visible, onClose])

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
        'flex flex-col overflow-hidden',
        'bg-slate-900/95 backdrop-blur-xl',
        'rounded-2xl shadow-2xl border border-slate-700/50',
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* 调整大小控制柄 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group "
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-0 w-0.5" />
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
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

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 运行节点按钮 */}
          <button
            onClick={() => selectedNode && onRunNode?.(selectedNode.id)}
            disabled={!selectedNode || !onRunNode}
            className={cn(
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'transition-colors',
              selectedNode && onRunNode
                ? 'text-slate-400 hover:text-green-400 hover:bg-slate-800/50 active:bg-slate-700/50'
                : 'text-slate-600 cursor-not-allowed'
            )}
            title="运行此节点"
          >
            <Play className="w-4 h-4" />
          </button>

          {/* 定位节点按钮 */}
          <button
            onClick={() => selectedNode && onLocateNode?.(selectedNode.id)}
            disabled={!selectedNode || !onLocateNode}
            className={cn(
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'transition-colors',
              selectedNode && onLocateNode
                ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 active:bg-slate-700/50'
                : 'text-slate-600 cursor-not-allowed'
            )}
            title="定位到此节点"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* 分隔线 */}
          <div className="h-6 w-px bg-slate-700/50" />

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className={cn(
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'text-slate-400 hover:text-slate-100',
              'hover:bg-slate-800/50 active:bg-slate-700/50',
              'transition-colors'
            )}
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex items-center gap-1 px-0 py-3">
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold',
            'transition-all duration-200',
            'flex items-center gap-2',
            activeTab === 'settings'
              ? 'bg-slate-800/50 text-slate-100'
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
              ? 'bg-slate-800/50 text-slate-100'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30'
          )}
        >
          <History className="w-4 h-4" />
          历史
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-0">
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
