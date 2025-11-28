'use client'

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@sker/ui/components/ui/sheet'
import { ScrollArea } from '@sker/ui/components/ui/scroll-area'
import { Input } from '@sker/ui/components/ui/input'
import { Search } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { NODE_CATEGORIES, DEFAULT_NODE_TYPES } from './types/workflow-nodes'

import type { WorkflowSidebarProps } from './types/workflow-canvas'

export function WorkflowSidebar({
  isOpen,
  onClose,
  onNodeTypeSelect,
  className,
}: WorkflowSidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  // 过滤节点类型
  const filteredNodes = Object.values(DEFAULT_NODE_TYPES).filter((node) =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNodeSelect = (nodeType: string) => {
    onNodeTypeSelect?.(nodeType)
    onClose()
    setSearchTerm('')
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className={cn('w-80 p-0', className)}>
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle>节点库</SheetTitle>
          <SheetDescription>
            从节点库中选择节点添加到工作流
          </SheetDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索节点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {searchTerm ? (
            // 搜索结果
            <div className="space-y-3">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    onSelect={() => handleNodeSelect(node.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  未找到匹配的节点
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
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {categoryNodes.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {categoryNodes.map((node) => (
                        <NodeCard
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
      </SheetContent>
    </Sheet>
  )
}

interface NodeCardProps {
  node: {
    id: string
    name: string
    description?: string
    color?: string
  }
  onSelect: () => void
}

function NodeCard({ node, onSelect }: NodeCardProps) {
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
            <div className="text-xs text-muted-foreground mt-1">
              {node.description}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}