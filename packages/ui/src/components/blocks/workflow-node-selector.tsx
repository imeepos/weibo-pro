"use client"

import React from "react"
import { CheckIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@sker/ui/components/ui/dialog"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@sker/ui/components/ui/command"

/**
 * 工作流节点类型
 */
export type WorkflowNodeType =
  | 'llm'
  | 'basic'
  | 'crawler'
  | 'control'
  | 'sentiment'
  | 'analysis'
  | 'scheduler'

/**
 * 节点类型映射
 */
export const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  llm: 'LLM',
  basic: '基础',
  crawler: '爬虫',
  control: '控制',
  sentiment: '舆情',
  analysis: '分析',
  scheduler: '调度',
}

/**
 * 工作流节点项
 */
export interface WorkflowNode {
  type: string
  title: string
  nodeType: WorkflowNodeType
  description?: string
}

/**
 * 工作流节点选择器属性
 */
export interface WorkflowNodeSelectorProps {
  /**
   * 可用节点列表
   */
  nodes: WorkflowNode[]
  /**
   * 选中的节点类型
   */
  value?: string
  /**
   * 节点选择回调
   */
  onChange?: (nodeType: string) => void
  /**
   * 打开状态
   */
  open: boolean
  /**
   * 状态变化回调
   */
  onOpenChange: (open: boolean) => void
  /**
   * 占位符文本
   */
  placeholder?: string
}

/**
 * 工作流节点选择器（纯样式组件）
 *
 * 存在即合理：提供节点选择的统一体验
 * 优雅即简约：Dialog + Command 模式，无冗余逻辑
 */
export function WorkflowNodeSelector({
  nodes,
  value,
  onChange,
  open,
  onOpenChange,
  placeholder = "搜索节点...",
}: WorkflowNodeSelectorProps) {
  // 按类型分组节点
  const groupedNodes = React.useMemo(() => {
    return nodes.reduce((acc, node) => {
      if (!acc[node.nodeType]) {
        acc[node.nodeType] = []
      }
      acc[node.nodeType].push(node)
      return acc
    }, {} as Record<WorkflowNodeType, WorkflowNode[]>)
  }, [nodes])

  const selectedNode = nodes.find((n) => n.type === value)

  return (
    <div>
      <label className="text-sm text-muted-foreground mb-2 block">选择节点</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
        >
          <span className={selectedNode ? '' : 'text-muted-foreground'}>
            {selectedNode ? (
              <span>
                {selectedNode.title}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({NODE_TYPE_LABELS[selectedNode.nodeType]})
                </span>
              </span>
            ) : '点击选择节点...'}
          </span>
          <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>

        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md p-0">
            <Command className="rounded-lg border">
              <CommandInput placeholder={placeholder} />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>未找到节点</CommandEmpty>
                {Object.entries(groupedNodes).map(([nodeType, nodesOfType]) => {
                  if (nodesOfType.length === 0) return null

                  return (
                    <CommandGroup
                      key={nodeType}
                      heading={NODE_TYPE_LABELS[nodeType as WorkflowNodeType]}
                    >
                      {nodesOfType.map((node) => (
                        <CommandItem
                          key={node.type}
                          value={`${node.title} ${node.type}`}
                          onSelect={() => {
                            onChange?.(node.type)
                            onOpenChange(false)
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{node.title}</div>
                            <div className="text-xs text-muted-foreground">{node.type}</div>
                            {node.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {node.description}
                              </div>
                            )}
                          </div>
                          {value === node.type && (
                            <CheckIcon className="size-4 ml-2 shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
