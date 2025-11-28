'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@sker/ui/components/ui/dialog'
import { Input } from '@sker/ui/components/ui/input'
import { ScrollArea } from '@sker/ui/components/ui/scroll-area'
import { Search } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { NODE_CATEGORIES, DEFAULT_NODE_TYPES } from './types/workflow-nodes'

import type { WorkflowNodeSelectorProps } from './types/workflow-canvas'

export function WorkflowNodeSelector({
  isOpen,
  onClose,
  onSelectNodeType,
  position,
  className,
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // 过滤节点类型
  const filteredNodes = Object.values(DEFAULT_NODE_TYPES).filter((node) =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNodeSelect = (nodeType: string) => {
    onSelectNodeType(nodeType)
    setSearchTerm('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'max-w-2xl max-h-[80vh] p-0 overflow-hidden',
          className
        )}
        style={position ? {
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        } : undefined}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>选择节点类型</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索节点类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6">
          {searchTerm ? (
            // 搜索结果
            <div className="space-y-2">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => (
                  <NodeItem
                    key={node.id}
                    node={node}
                    onSelect={() => handleNodeSelect(node.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  未找到匹配的节点类型
                </div>
              )}
            </div>
          ) : (
            // 按分类显示
            <div className="space-y-6">
              {NODE_CATEGORIES.map((category) => {
                const categoryNodes = Object.values(DEFAULT_NODE_TYPES).filter(
                  (node) => node.category === category.id
                )

                if (categoryNodes.length === 0) return null

                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      {category.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {category.description}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryNodes.map((node) => (
                        <NodeItem
                          key={node.id}
                          node={node}
                          onSelect={() => handleNodeSelect(node.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface NodeItemProps {
  node: {
    id: string
    name: string
    description?: string
    color?: string
  }
  onSelect: () => void
}

function NodeItem({ node, onSelect }: NodeItemProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-3 text-left border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0"
          style={{ backgroundColor: node.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{node.name}</div>
          {node.description && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {node.description}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}