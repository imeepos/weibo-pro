'use client'

import React from 'react'
import { Button } from '@sker/ui/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sker/ui/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@sker/ui/components/ui/dropdown-menu'
import { Plus, Play, Save, Download } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { NODE_CATEGORIES, DEFAULT_NODE_TYPES } from './types/workflow-nodes'

import type { WorkflowToolbarProps } from './types/workflow-canvas'

export function WorkflowToolbar({
  onAddNode,
  onRun,
  onSave,
  onExport,
  className,
}: WorkflowToolbarProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-background border border-border rounded-lg shadow-lg',
          className
        )}
      >
        {/* 添加节点下拉菜单 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>添加节点</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>添加新节点到工作流</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-64">
            {NODE_CATEGORIES.map((category) => {
              const categoryNodes = Object.values(DEFAULT_NODE_TYPES).filter(
                (node) => node.category === category.id
              )

              if (categoryNodes.length === 0) return null

              return (
                <div key={category.id}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b border-border">
                    {category.name}
                  </div>
                  {categoryNodes.map((node) => (
                    <DropdownMenuItem
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
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        {/* 运行按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={onRun}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              <span>运行</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>运行工作流</p>
          </TooltipContent>
        </Tooltip>

        {/* 保存按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>保存</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>保存工作流</p>
          </TooltipContent>
        </Tooltip>

        {/* 导出下拉菜单 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>导出</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>导出工作流</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport?.('json')}>
              导出为 JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('image')}>
              导出为图片
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}