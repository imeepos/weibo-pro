'use client'

import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Settings } from 'lucide-react'
import { WorkflowGraphAst } from '@sker/workflow'
import { IEdge } from '@sker/workflow'

/**
 * 运行配置对话框
 *
 * 存在即合理：
 * - 收集工作流运行所需的输入参数
 * - 自动识别入度为 0 的输入节点
 * - 支持多种数据类型的输入
 * - 合并默认输入和用户自定义输入
 *
 * 优雅设计：
 * - 自动推断节点的输入属性
 * - 智能表单生成
 * - 响应式布局
 */
export interface RunConfigDialogProps {
  visible: boolean
  workflow: WorkflowGraphAst
  defaultInputs?: Record<string, unknown>
  onConfirm: (inputs: Record<string, unknown>) => void
  onCancel: () => void
}

interface InputField {
  nodeId: string
  nodeName: string
  propertyKey: string
  propertyLabel: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'json'
  value: any
}

export function RunConfigDialog({
  visible,
  workflow,
  defaultInputs = {},
  onConfirm,
  onCancel,
}: RunConfigDialogProps) {
  const [inputs, setInputs] = useState<Record<string, unknown>>(defaultInputs)

  // 识别输入节点（入度为 0 的节点）
  const inputNodes = useMemo(() => {
    if (!workflow?.nodes || !workflow?.edges) {
      return []
    }

    return workflow.nodes.filter((node) => {
      const hasIncomingEdges = workflow.edges.some(
        (edge: IEdge) => edge.to === node.id
      )
      return !hasIncomingEdges
    })
  }, [workflow])

  // 提取输入字段
  const inputFields = useMemo(() => {
    const fields: InputField[] = []

    inputNodes.forEach((node: any) => {
      const nodeType = node.type || node.constructor?.name || 'Unknown'

      // 常见的输入属性（可扩展）
      const commonInputProps = ['keyword', 'startDate', 'endDate', 'page', 'mblogid']

      commonInputProps.forEach((propKey) => {
        if (propKey in node) {
          const fullKey = `${node.id}.${propKey}`
          fields.push({
            nodeId: node.id,
            nodeName: node.name || nodeType,
            propertyKey: propKey,
            propertyLabel: formatLabel(propKey),
            type: inferType(propKey, node[propKey]),
            value: inputs[fullKey] ?? node[propKey],
          })
        }
      })
    })

    return fields
  }, [inputNodes, inputs])

  if (!visible) return null

  const handleInputChange = (fieldKey: string, value: any) => {
    setInputs((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
  }

  const handleConfirm = () => {
    onConfirm(inputs)
  }

  const handleCancel = () => {
    setInputs(defaultInputs)
    onCancel()
  }

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-2xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Settings className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-semibold text-white">运行配置</h3>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {inputFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground/70">
                <Settings className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground/70">
                此工作流不需要配置输入参数
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {inputFields.map((field) => {
                const fullKey = `${field.nodeId}.${field.propertyKey}`

                return (
                  <div key={fullKey}>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {field.nodeName} - {field.propertyLabel}
                    </label>
                    {renderInputField(field, fullKey, handleInputChange)}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            <span>开始运行</span>
          </button>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

/**
 * 渲染输入字段
 */
function renderInputField(
  field: InputField,
  fullKey: string,
  onChange: (key: string, value: any) => void
) {
  const baseInputClass =
    'w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  switch (field.type) {
    case 'string':
      return (
        <input
          type="text"
          value={field.value || ''}
          onChange={(e) => onChange(fullKey, e.target.value)}
          placeholder={`请输入${field.propertyLabel}`}
          className={baseInputClass}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={field.value || ''}
          onChange={(e) => onChange(fullKey, Number(e.target.value))}
          placeholder={`请输入${field.propertyLabel}`}
          className={baseInputClass}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={formatDateValue(field.value)}
          onChange={(e) => onChange(fullKey, new Date(e.target.value))}
          className={baseInputClass}
        />
      )

    case 'boolean':
      return (
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={field.value || false}
            onChange={(e) => onChange(fullKey, e.target.checked)}
            className="h-4 w-4 rounded border-border bg-secondary text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-card"
          />
          <span className="text-sm text-muted-foreground">启用</span>
        </label>
      )

    case 'json':
      return (
        <textarea
          value={
            typeof field.value === 'object'
              ? JSON.stringify(field.value, null, 2)
              : field.value || ''
          }
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange(fullKey, parsed)
            } catch {
              onChange(fullKey, e.target.value)
            }
          }}
          placeholder={`请输入 JSON 格式的${field.propertyLabel}`}
          rows={4}
          className={`${baseInputClass} font-mono text-xs`}
        />
      )

    default:
      return (
        <input
          type="text"
          value={field.value || ''}
          onChange={(e) => onChange(fullKey, e.target.value)}
          placeholder={`请输入${field.propertyLabel}`}
          className={baseInputClass}
        />
      )
  }
}

/**
 * 格式化标签
 */
function formatLabel(key: string): string {
  const labelMap: Record<string, string> = {
    keyword: '关键词',
    startDate: '开始日期',
    endDate: '结束日期',
    page: '页码',
    mblogid: '微博 ID',
  }

  return labelMap[key] || key
}

/**
 * 推断类型
 */
function inferType(
  key: string,
  value: any
): 'string' | 'number' | 'date' | 'boolean' | 'json' {
  if (key.toLowerCase().includes('date')) {
    return 'date'
  }

  if (key.toLowerCase().includes('page') || key.toLowerCase().includes('count')) {
    return 'number'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (value instanceof Date) {
    return 'date'
  }

  if (typeof value === 'object' && value !== null) {
    return 'json'
  }

  return 'string'
}

/**
 * 格式化日期值
 */
function formatDateValue(value: any): string {
  if (!value) return ''

  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toISOString().split('T')[0]!
  } catch {
    return ''
  }
}
