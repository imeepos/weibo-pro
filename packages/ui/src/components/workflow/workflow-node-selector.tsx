'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, Sparkles, Box, Globe } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'

export type NodeType = 'llm' | 'basic' | 'crawler' | 'control' | 'sentiment' | 'analysis'

export interface NodeItem {
  type: string
  label: string
  nodeType?: NodeType
  inputs: any[]
  outputs: any[]
}

export interface WorkflowNodeSelectorProps {
  visible: boolean
  position: { x: number; y: number }
  nodes: NodeItem[]
  onSelect: (node: NodeItem) => void
  onClose: () => void
  className?: string
}

// 分类配置
const CATEGORIES = [
  { key: 'all', label: '全部', icon: Box },
  { key: 'basic', label: '基础', icon: Box },
  { key: 'control', label: '控制', icon: Globe },
  { key: 'llm', label: 'LLM', icon: Sparkles },
  { key: 'crawler', label: '爬虫', icon: Globe },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

/**
 * 工作流节点选择器
 *
 * 纯展示组件：负责搜索和选择节点的 UI
 */
export const WorkflowNodeSelector: React.FC<WorkflowNodeSelectorProps> = ({
  visible,
  position,
  nodes,
  onSelect,
  onClose,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 筛选节点：先按分类，再按关键字
  const filteredNodes = useMemo(() => {
    let result = nodes

    // 按分类筛选
    if (selectedCategory !== 'all') {
      result = result.filter((node) => node.nodeType === selectedCategory)
    }

    // 按关键字筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query)
      )
    }

    return result
  }, [nodes, selectedCategory, searchQuery])

  // 聚焦搜索框
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery, selectedCategory])

  // 重置状态
  useEffect(() => {
    if (!visible) {
      setSearchQuery('')
      setSelectedCategory('all')
      setSelectedIndex(0)
    }
  }, [visible])

  // 键盘和鼠标事件
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (visible && !target.closest('.workflow-node-selector')) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredNodes.length - 1 ? prev + 1 : prev
        )
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (filteredNodes[selectedIndex]) {
          handleSelect(filteredNodes[selectedIndex])
        }
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose, filteredNodes, selectedIndex])

  const handleSelect = (node: NodeItem) => {
    onSelect(node)
    onClose()
  }

  if (!visible) {
    return null
  }

  const selectorContent = (
    <div
      className={cn(
        'workflow-node-selector flex rounded-xl border border-border',
        'bg-popover shadow-2xl shadow-black/40 backdrop-blur-xl',
        className
      )}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 99999,
        width: '560px',
        height: '480px',
      }}
    >
      {/* 左侧分类 */}
      <div className="flex flex-col w-32 border-r border-border bg-muted/30 rounded-l-xl">
        <div className="px-3 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground">分类</h3>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            const isActive = selectedCategory === category.key
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span>{category.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 右侧节点列表 */}
      <div className="flex flex-col flex-1">
        {/* 搜索框 */}
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <label className="flex items-center gap-2 rounded-lg border border-input bg-input px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索节点..."
              className="flex-1 border-none bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            />
          </label>
        </div>

        {/* 节点列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-sm text-muted-foreground">
                {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredNodes.map((node, index) => (
                <button
                  key={node.type}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2.5',
                    'text-left text-sm transition',
                    index === selectedIndex
                      ? 'border-primary bg-accent text-foreground shadow-[0_0_12px_rgba(19,91,236,0.25)]'
                      : 'border-transparent bg-muted text-foreground hover:border-border hover:bg-accent'
                  )}
                  onClick={() => handleSelect(node)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                      {node.label.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{node.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {node.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs text-muted-foreground">
                    {node.inputs.length > 0 && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                        入 {node.inputs.length}
                      </span>
                    )}
                    {node.outputs.length > 0 && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                        出 {node.outputs.length}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部快捷键提示 */}
        <div className="border-t border-border bg-popover px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  ↑↓
                </kbd>
                <span>选择</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  Enter
                </kbd>
                <span>确认</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  ESC
                </kbd>
                <span>关闭</span>
              </span>
            </div>
            {filteredNodes.length > 0 && (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {filteredNodes.length} 个节点
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(selectorContent, document.body)
    : null
}

WorkflowNodeSelector.displayName = 'WorkflowNodeSelector'
