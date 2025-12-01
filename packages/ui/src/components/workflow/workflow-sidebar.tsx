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
import { getWorkflowNodeDefinitions } from './metadata-factory'

import type { WorkflowSidebarProps } from './types/workflow-canvas'

export function WorkflowSidebar({
  isOpen,
  onClose,
  onNodeTypeSelect,
  className,
}: WorkflowSidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  const nodeDefinitions = React.useMemo(() => getWorkflowNodeDefinitions(), [])

  const filteredNodes = React.useMemo(() => {
    const nodes = Object.values(nodeDefinitions)
    if (!searchTerm) return nodes

    const term = searchTerm.toLowerCase()
    return nodes.filter((node) =>
      node.name.toLowerCase().includes(term) ||
      node.description?.toLowerCase().includes(term)
    )
  }, [nodeDefinitions, searchTerm])

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
          <div className="space-y-2">
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
          style={{ backgroundColor: node.color || '#6b7280' }}
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
