'use client'

import React, { useEffect } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@sker/ui/components/ui/context-menu'
import { Plus, Copy, Trash2, Paste } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { NODE_CATEGORIES, DEFAULT_NODE_TYPES } from './types/workflow-nodes'

import type { WorkflowContextMenuProps } from './types/workflow-canvas'

interface ExtendedWorkflowContextMenuProps extends WorkflowContextMenuProps {
  isOpen: boolean
}

export function WorkflowContextMenu({
  position,
  isOpen,
  onClose,
  onAddNode,
  onDeleteSelected,
  onCopySelected,
  onPaste,
  className,
}: ExtendedWorkflowContextMenuProps) {
  // 关闭菜单的全局点击事件
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = () => {
      onClose()
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed z-50 min-w-[200px] bg-popover text-popover-foreground border border-border rounded-md shadow-lg',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <ContextMenuContent className="w-64">
        {/* 添加节点菜单 */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>添加节点</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {NODE_CATEGORIES.map((category) => (
              <ContextMenuSub key={category.id}>
                <ContextMenuSubTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {Object.values(DEFAULT_NODE_TYPES)
                    .filter((node) => node.category === category.id)
                    .map((node) => (
                      <ContextMenuItem
                        key={node.id}
                        onClick={() => onAddNode?.(node.id)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: node.color }}
                        />
                        <div>
                          <div className="font-medium">{node.name}</div>
                          {node.description && (
                            <div className="text-xs text-muted-foreground">
                              {node.description}
                            </div>
                          )}
                        </div>
                      </ContextMenuItem>
                    ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* 编辑操作 */}
        <ContextMenuItem
          onClick={onCopySelected}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          <span>复制</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onPaste}
          className="flex items-center gap-2"
        >
          <Paste className="h-4 w-4" />
          <span>粘贴</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* 删除操作 */}
        <ContextMenuItem
          onClick={onDeleteSelected}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>删除选中</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </div>
  )
}