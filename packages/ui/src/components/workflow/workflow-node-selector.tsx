'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'

export interface NodeItem {
  type: string
  label: string
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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodes
    }
    const query = searchQuery.toLowerCase()
    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
    )
  }, [nodes, searchQuery])

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  useEffect(() => {
    if (!visible) {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [visible])

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
        'workflow-node-selector min-w-[18rem] max-w-lg rounded-xl border border-border',
        'bg-popover shadow-2xl shadow-black/40 backdrop-blur-xl',
        className
      )}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
    >
      {/* 搜索框 */}
      <div className="px-4 pt-3 pb-2">
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
      <div className="max-h-80 overflow-x-hidden overflow-y-auto px-2 pb-2">
        {filteredNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2 pt-1">
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
                    <span className="text-xs text-muted-foreground">{node.type}</span>
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

      {/* 快捷键提示 */}
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
  )

  return typeof document !== 'undefined'
    ? createPortal(selectorContent, document.body)
    : null
}

WorkflowNodeSelector.displayName = 'WorkflowNodeSelector'
