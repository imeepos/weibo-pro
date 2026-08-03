'use client'

import React from 'react'
import { cn } from '@sker/ui/lib/utils'
import type { NodeItem } from './workflow-node-selector-types'

export function NodeList({
  filteredNodes,
  selectedIndex,
  searchQuery,
  onSelect,
  onHover,
}: {
  filteredNodes: NodeItem[]
  selectedIndex: number
  searchQuery: string
  onSelect: (node: NodeItem) => void
  onHover: (index: number) => void
}) {
  if (filteredNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-sm text-muted-foreground">
          {searchQuery ? '未找到匹配的节点' : '暂无可用节点'}
        </div>
      </div>
    )
  }

  return (
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
          onClick={() => onSelect(node)}
          onMouseEnter={() => onHover(index)}
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
  )
}
