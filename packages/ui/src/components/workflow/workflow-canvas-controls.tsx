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
import {
  Play,
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
} from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { useWorkflowIsRunning, useWorkflowIsSaving } from './hooks/use-workflow-canvas'

import type { WorkflowCanvasControlsProps } from './types/workflow-canvas'

export function WorkflowCanvasControls({
  onRun,
  onSave,
  onExport,
  onImport,
  onFitView,
  onZoomIn,
  onZoomOut,
  onResetView,
  className,
}: WorkflowCanvasControlsProps) {
  const isRunning = useWorkflowIsRunning()
  const isSaving = useWorkflowIsSaving()

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        onImport?.(data)
      } catch (error) {
        console.error('Failed to parse workflow file:', error)
      }
    }
    reader.readAsText(file)

    // 重置 input 以便可以再次选择同一个文件
    event.target.value = ''
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-background/80 backdrop-blur-sm border border-border rounded-lg shadow-lg',
          className
        )}
      >
        {/* 运行按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              onClick={onRun}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
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
              size="icon"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>保存工作流</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* 导入按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                id="workflow-import"
              />
              <Button
                variant="outline"
                size="icon"
                asChild
              >
                <label htmlFor="workflow-import" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                </label>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>导入工作流</p>
          </TooltipContent>
        </Tooltip>

        {/* 导出下拉菜单 */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
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

        <div className="w-px h-6 bg-border mx-1" />

        {/* 视图控制 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>放大</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>缩小</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onFitView}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>适应视图</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onResetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>重置视图</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}