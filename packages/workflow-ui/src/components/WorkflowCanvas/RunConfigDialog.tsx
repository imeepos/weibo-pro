'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Settings } from 'lucide-react'
import { WorkflowGraphAst, getInputMetadata, resolveConstructor } from '@sker/workflow'
import { IEdge } from '@sker/workflow'
import { WorkflowFormField, type InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'
import { EmptyState } from '@sker/ui/components/ui'
import { Button } from '@sker/ui/components/ui/button'

/**
 * 运行配置对话框
 *
 * 优雅设计：
 * - 自动收集所有入度为 0 的起始节点
 * - 只渲染带有 @Input 装饰器的属性（通过元数据系统）
 * - 智能推断字段类型（优先使用 @Input 的 type）
 * - 使用 WorkflowFormField 构建统一表单
 * - 保留节点的默认值
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
  type: InputFieldType
  value: any
  fullKey: string
}

export function RunConfigDialog({
  visible,
  workflow,
  defaultInputs = {},
  onConfirm,
  onCancel,
}: RunConfigDialogProps) {
  const [inputs, setInputs] = useState<Record<string, unknown>>({})
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化表单输入值
  useEffect(() => {
    // 只在 Dialog 可见时初始化
    if (!visible) {
      setIsInitialized(false)
      return
    }

    // 规范化 defaultInputs 格式：支持简化格式和完整格式
    const normalizedInputs: Record<string, unknown> = {}

    // 收集所有入度为 0 的节点的 @Input 属性值
    // 注意：workflow.nodes 是 AST 节点数组，不是 React Flow 节点数组
    if (workflow?.nodes && workflow?.edges) {
      const startNodes = workflow.nodes.filter((node) => {
        const hasIncomingEdges = workflow.edges.some((edge: IEdge) => edge.to === node.id)
        return !hasIncomingEdges
      })

      startNodes.forEach((astNode: any) => {
        try {
          const ctor = resolveConstructor(astNode)
          const inputMetadatas = getInputMetadata(ctor)
          const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

          metadataArray.forEach((metadata) => {
            const propKey = String(metadata.propertyKey)
            const fullKey = `${astNode.id}.${propKey}`

            // 优先级：完整格式 > 简化格式 > 节点当前值 > 装饰器默认值
            let finalValue: any = undefined

            // 1. 优先使用完整格式 (nodeId.propertyKey)
            if (fullKey in defaultInputs) {
              finalValue = defaultInputs[fullKey]
            }
            // 2. 回退到简化格式 (propertyKey) - 兼容旧数据或用户手动填写
            else if (propKey in defaultInputs) {
              finalValue = defaultInputs[propKey]
            }
            // 3. 使用节点当前值
            else {
              const nodeValue = astNode[propKey]
              finalValue = nodeValue !== undefined ? nodeValue : metadata.defaultValue
            }

            // 只在值不为 undefined 时才添加
            if (finalValue !== undefined) {
              normalizedInputs[fullKey] = finalValue
            }
          })
        } catch (error) {
          console.error('[RunConfigDialog] 处理节点失败:', error)
        }
      })
    }

    setInputs(normalizedInputs)
    setIsInitialized(true)  // 标记初始化完成
  }, [visible, workflow, defaultInputs])

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

  // 提取所有带 @Input 装饰器的字段
  const inputFields = useMemo(() => {
    const fields: InputField[] = []

    inputNodes.forEach((node: any) => {
      // 优雅的名称获取策略：
      // 1. 优先使用 node.name（用户自定义名称）
      // 2. 回退到 node.metadata.class.title（节点类型的中文名）
      // 3. 最后使用类型名称
      const nodeName = node.name || node.metadata?.class?.title || node.type || '未命名节点'

      try {
        // 获取节点构造函数
        const ctor = resolveConstructor(node)

        // 获取该节点类型的所有 @Input 元数据
        const inputMetadatas = getInputMetadata(ctor)
        const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

        // 遍历所有 @Input 属性
        metadataArray.forEach((metadata) => {
          const propKey = String(metadata.propertyKey)
          const fullKey = `${node.id}.${propKey}`

          // 获取当前值（inputs 初始化时已包含节点当前值和默认值）
          const currentValue = inputs[fullKey]

          // 优先使用 @Input 装饰器指定的类型，否则智能推断
          const fieldType = metadata.type || inferFieldType(propKey, currentValue)

          // 优先使用 @Input 装饰器指定的标题，否则格式化属性名
          const label = metadata.title || formatLabel(propKey)

          fields.push({
            nodeId: node.id,
            nodeName,
            propertyKey: propKey,
            propertyLabel: label,
            type: fieldType,
            value: currentValue,
            fullKey,
          })
        })
      } catch (error) {
        console.warn(`无法获取节点 ${nodeName} 的 @Input 元数据:`, error)
      }
    })

    return fields
  }, [inputNodes, inputs])

  if (!visible) return null

  const handleInputChange = (fullKey: string, value: any) => {
    // 防止在初始化期间触发 onChange 导致数据被清空
    if (!isInitialized) {
      return
    }

    setInputs((prev) => ({
      ...prev,
      [fullKey]: value,
    }))
  }

  const handleConfirm = () => {
    onConfirm(inputs)
  }

  const handleCancel = () => {
    setInputs(defaultInputs)
    setIsInitialized(false)
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
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Settings className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-semibold text-foreground">运行配置</h3>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {inputFields.length === 0 ? (
            <EmptyState
              icon={Settings}
              description="此工作流不需要配置输入参数"
            />
          ) : (
            <div className="space-y-6">
              {/* 按节点分组显示 */}
              {groupFieldsByNode(inputFields).map(({ nodeName, fields }) => (
                <div key={fields[0]!.nodeId} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{nodeName}</h4>
                    <span className="text-xs text-muted-foreground">({fields.length} 个参数)</span>
                  </div>
                  <div className="pl-4 space-y-3">
                    {fields.map((field) => (
                      <WorkflowFormField
                        key={field.fullKey}
                        label={field.propertyLabel}
                        value={field.value}
                        type={field.type}
                        onChange={(value) => handleInputChange(field.fullKey, value)}
                        placeholder={getPlaceholder(field.propertyKey, field.type)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-6">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            <span>开始运行</span>
          </Button>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

/**
 * 智能推断字段类型
 * 优雅设计：根据属性名和值推断最合适的输入类型（作为 @Input type 的备选）
 */
function inferFieldType(propKey: string, value: any): InputFieldType {
  const lowerKey = propKey.toLowerCase()

  // 根据属性名推断 - 图片相关
  if (lowerKey.includes('image') || lowerKey.includes('img') || lowerKey.includes('picture') || lowerKey.includes('photo')) {
    return 'image'
  }

  // 根据属性名推断 - 视频相关
  if (lowerKey.includes('video') || lowerKey.includes('movie') || lowerKey.includes('film')) {
    return 'video'
  }

  // 根据属性名推断 - 音频相关
  if (lowerKey.includes('audio') || lowerKey.includes('sound') || lowerKey.includes('music')) {
    return 'audio'
  }

  // 根据属性名推断 - 日期时间
  if (lowerKey.includes('date')) {
    return 'date'
  }

  if (lowerKey.includes('time') && !lowerKey.includes('date')) {
    return 'datetime-local'
  }

  if (lowerKey.includes('count') || lowerKey.includes('page') || lowerKey.includes('limit') || lowerKey.includes('size')) {
    return 'number'
  }

  if (lowerKey.includes('enable') || lowerKey.includes('is') || lowerKey.includes('has') || lowerKey.includes('should')) {
    return 'boolean'
  }

  if (lowerKey.includes('description') || lowerKey.includes('content') || lowerKey.includes('text')) {
    return 'textarea'
  }

  if (lowerKey.includes('markdown') || lowerKey.includes('rich')) {
    return 'richtext'
  }

  // 根据值的类型推断
  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (value instanceof Date) {
    return 'date'
  }

  if (typeof value === 'string') {
    // 检查是否为图片 URL
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value) || value.startsWith('data:image/')) {
      return 'image'
    }

    // 检查是否为视频 URL
    if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(value) || value.startsWith('data:video/')) {
      return 'video'
    }

    // 检查是否为音频 URL
    if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(value) || value.startsWith('data:audio/')) {
      return 'audio'
    }

    // 检查字符串长度，长字符串用 textarea
    if (value.length > 100) {
      return 'textarea'
    }
    return 'string'
  }

  // 复杂类型
  if (typeof value === 'object' && value !== null) {
    return 'any'
  }

  // 默认文本
  return 'string'
}

/**
 * 格式化属性标签
 * 优雅设计：驼峰转中文、常见词汇映射
 */
function formatLabel(key: string): string {
  // 常见词汇映射
  const labelMap: Record<string, string> = {
    keyword: '关键词',
    query: '查询条件',
    startDate: '开始日期',
    endDate: '结束日期',
    page: '页码',
    pageSize: '每页数量',
    limit: '限制数量',
    offset: '偏移量',
    mblogid: '微博 ID',
    url: '链接地址',
    method: '请求方法',
    headers: '请求头',
    body: '请求体',
    timeout: '超时时间',
    retries: '重试次数',
    interval: '间隔时间',
    delay: '延迟时间',
    enabled: '启用',
    disabled: '禁用',
    image: '图片',
    uploadedImage: '已上传图片',
    imageUrl: '图片地址',
    video: '视频',
    uploadedVideo: '已上传视频',
    videoUrl: '视频地址',
    audio: '音频',
    uploadedAudio: '已上传音频',
    audioUrl: '音频地址',
  }

  if (labelMap[key]) {
    return labelMap[key]
  }

  // 驼峰转中文：camelCase -> Camel Case
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim()
}

/**
 * 获取占位符文本
 */
function getPlaceholder(propKey: string, type: InputFieldType): string {
  const lowerKey = propKey.toLowerCase()

  if (lowerKey.includes('keyword') || lowerKey.includes('query')) {
    return '请输入搜索关键词'
  }

  if (lowerKey.includes('url')) {
    return 'https://example.com'
  }

  if (lowerKey.includes('page')) {
    return '1'
  }

  if (type === 'number') {
    return '0'
  }

  if (type === 'textarea') {
    return '请输入多行文本...'
  }

  if (type === 'image') {
    return '点击上传图片'
  }

  if (type === 'video') {
    return '点击上传视频'
  }

  if (type === 'audio') {
    return '点击上传音频'
  }

  return `请输入${formatLabel(propKey)}`
}

/**
 * 按节点分组字段
 */
function groupFieldsByNode(fields: InputField[]): Array<{ nodeName: string; fields: InputField[] }> {
  const grouped = new Map<string, InputField[]>()

  fields.forEach((field) => {
    const key = `${field.nodeId}-${field.nodeName}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(field)
  })

  return Array.from(grouped.entries()).map(([key, fields]) => ({
    nodeName: fields[0]!.nodeName,
    fields,
  }))
}
