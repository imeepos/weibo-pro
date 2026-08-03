'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { CategoryList } from './workflow-node-selector-category-list'
import { NodeList } from './workflow-node-selector-node-list'
import { type CategoryKey } from './workflow-node-selector-categories'
import type { NodeItem, WorkflowNodeSelectorProps } from './workflow-node-selector-types'

export type { NodeType, NodeItem, WorkflowNodeSelectorProps } from './workflow-node-selector-types'

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
      <CategoryList
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

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
          <NodeList
            filteredNodes={filteredNodes}
            selectedIndex={selectedIndex}
            searchQuery={searchQuery}
            onSelect={handleSelect}
            onHover={setSelectedIndex}
          />
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
