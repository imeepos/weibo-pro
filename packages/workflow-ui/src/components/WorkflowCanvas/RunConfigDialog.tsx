'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Settings } from 'lucide-react'
import { WorkflowGraphAst, getInputMetadata, resolveConstructor, SETTING_METHOD } from '@sker/workflow'
import { IEdge } from '@sker/workflow'
import { WorkflowFormField, type InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'
import { EmptyState } from '@sker/ui/components/ui'
import { Button } from '@sker/ui/components/ui/button'
import { root } from '@sker/core'

/**
 * 运行配置对话框
 *
 * 优雅设计：
 * - 优先使用 entryNodeIds 确定入口节点，为空时回退到无入边节点
 * - 只渲染带有 @Input 装饰器的属性（通过元数据系统）
 * - 智能推断字段类型（优先使用 @Input 的 type）
 * - 使用 WorkflowFormField 构建统一表单
 * - 保留节点的默认值
 * - 每次打开时获取工作流最新状态
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

interface NodeSettingRenderer {
  (ast: any, onPropertyChange: (property: string, value: any) => void): React.ReactNode
}

/**
 * 从工作流 AST 收集入口节点的输入值
 *
 * 优先使用 entryNodeIds，为空时回退到自动识别（无入边节点）
 */
function collectInputsFromWorkflow(
  workflow: WorkflowGraphAst,
  defaultInputs: Record<string, unknown>
): Record<string, unknown> {
  const normalizedInputs: Record<string, unknown> = {}

  if (!workflow?.nodes || !workflow?.edges) {
    return normalizedInputs
  }

  // 优先使用显式指定的入口节点，否则回退到无入边节点
  const startNodes = workflow.entryNodeIds?.length
    ? workflow.nodes.filter((node) => workflow.entryNodeIds.includes(node.id))
    : workflow.nodes.filter((node) => {
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

        if (fullKey in defaultInputs) {
          finalValue = defaultInputs[fullKey]
        } else if (propKey in defaultInputs) {
          finalValue = defaultInputs[propKey]
        } else {
          const nodeValue = astNode[propKey]
          finalValue = nodeValue !== undefined ? nodeValue : metadata.defaultValue
        }

        if (finalValue !== undefined) {
          normalizedInputs[fullKey] = finalValue
        }
      })
    } catch (error) {
      console.error('[RunConfigDialog] 处理节点失败:', error)
    }
  })

  return normalizedInputs
}

function RunConfigDialog({
  visible,
  workflow,
  defaultInputs = {},
  onConfirm,
  onCancel,
}: RunConfigDialogProps) {
  const [inputs, setInputs] = useState<Record<string, unknown>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const dialogVisibleRef = useRef(false)

  // 每次打开对话框时，从工作流获取最新状态
  useEffect(() => {
    const isOpening = visible && !dialogVisibleRef.current

    if (!visible) {
      setIsInitialized(false)
      dialogVisibleRef.current = false
      return
    }

    if (!isOpening) {
      return
    }

    // 从当前工作流 AST 收集最新的输入值
    const latestInputs = collectInputsFromWorkflow(workflow, defaultInputs)
    setInputs(latestInputs)
    setIsInitialized(true)
    dialogVisibleRef.current = true
  }, [visible, workflow, defaultInputs])

  // 识别入口节点（优先使用 entryNodeIds，为空时回退到无入边节点）
  const inputNodes = useMemo(() => {
    if (!workflow?.nodes || !workflow?.edges) {
      return []
    }

    return workflow.entryNodeIds?.length
      ? workflow.nodes.filter((node) => workflow.entryNodeIds.includes(node.id))
      : workflow.nodes.filter((node) => {
          const hasIncomingEdges = workflow.edges.some((edge: IEdge) => edge.to === node.id)
          return !hasIncomingEdges
        })
  }, [workflow])

  // 获取节点的 @Setting 渲染器（复用 PropertyPanel 的逻辑）
  // 使用 ref 避免重新创建导致无限渲染
  const settingRenderersRef = useRef<Map<string, NodeSettingRenderer> | null>(null)
  const settingRenderers = useMemo(() => {
    if (!settingRenderersRef.current) {
      const renderers = new Map<string, NodeSettingRenderer>()

      inputNodes.forEach((node: any) => {
        try {
          const ctor = resolveConstructor(node)
          const settings = root.get(SETTING_METHOD, [])
          const setting = settings.find((s: any) => s.ast?.name === ctor?.name)
          if (setting) {
            const instance = root.get(setting.target)
            renderers.set(node.id, (ast: any, onPropertyChange: (prop: string, value: any) => void) => {
              // 使用稳定引用的回调，避免无限渲染
              return (instance as any)[setting.property].call(instance, ast, onPropertyChange)
            })
          }
        } catch (error) {
          console.error('[RunConfigDialog] 获取 @Setting 渲染器失败:', {
            nodeId: node.id,
            nodeType: node.type,
            error
          })
        }
      })

      settingRenderersRef.current = renderers
    }

    return settingRenderersRef.current
  }, [inputNodes])

  const handleInputChange = useCallback((fullKey: string, value: any) => {
    setInputs((prev) => ({
      ...prev,
      [fullKey]: value,
    }))
  }, [])

  // 为每个节点创建稳定的 propChangeWrapper，同时存储最新的 node 引用
  const nodeRefsRef = useRef<Map<string, any>>(new Map())
  const propChangeWrappersRef = useRef<Map<string, (prop: string, value: any) => void>>(new Map())
  const getPropChangeWrapper = useCallback((nodeId: string, node: any) => {
    // 更新 node 引用
    nodeRefsRef.current.set(nodeId, node)

    if (!propChangeWrappersRef.current.has(nodeId)) {
      propChangeWrappersRef.current.set(nodeId, (prop: string, value: any) => {
        // 从 ref 获取最新的 node 引用
        const currentNode = nodeRefsRef.current.get(nodeId)
        if (currentNode) {
          currentNode[prop] = value
        }
        // 强制触发重新渲染
        setInputs((prev) => ({ ...prev, [`${nodeId}.${prop}`]: value }))
      })
    }
    return propChangeWrappersRef.current.get(nodeId)!
  }, [])

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
          const fieldType: InputFieldType = metadata.type || inferFieldType(propKey, currentValue)

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

  const handleConfirm = useCallback(() => {
    onConfirm(inputs)
  }, [inputs, onConfirm])

  const handleCancel = useCallback(() => {
    // 清空输入状态，避免下次打开时残留旧数据
    setInputs({})
    setIsInitialized(false)
    dialogVisibleRef.current = false
    onCancel()
  }, [onCancel])

  if (!visible) return null

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
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {inputFields.length === 0 ? (
            <EmptyState
              icon={Settings}
              description="此工作流不需要配置输入参数"
            />
          ) : (
            <div className="space-y-6">
              {/* 按节点分组显示 */}
              {groupFieldsByNode(inputFields).map(({ nodeId, nodeName, fields }) => {
                const customSetting = settingRenderers.get(nodeId)
                const node = workflow?.nodes.find((n: any) => n.id === nodeId)
                const propChangeWrapper = getPropChangeWrapper(nodeId, node)

                return (
                  <div key={nodeId} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <h4 className="text-sm font-semibold text-foreground">{nodeName}</h4>
                      <span className="text-xs text-muted-foreground">({fields.length} 个参数)</span>
                    </div>
                    <div className="pl-4">
                      {customSetting && node ? (
                        // 使用稳定的 propChangeWrapper 调用 @Setting 渲染器
                        customSetting(node, propChangeWrapper)
                      ) : (
                        // 回退到 WorkflowFormField
                        <div className="space-y-3">
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
                      )}
                    </div>
                  </div>
                )
              })}
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

// 使用 React.memo 优化，只在 props 变化时重新渲染
const MemoizedRunConfigDialog = React.memo(RunConfigDialog, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.workflow === nextProps.workflow &&
    prevProps.defaultInputs === nextProps.defaultInputs &&
    prevProps.onConfirm === nextProps.onConfirm &&
    prevProps.onCancel === nextProps.onCancel
  )
})

// 同时提供命名导出和默认导出
export { MemoizedRunConfigDialog as RunConfigDialog }
export default MemoizedRunConfigDialog

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
function groupFieldsByNode(fields: InputField[]): Array<{ nodeId: string; nodeName: string; fields: InputField[] }> {
  const grouped = new Map<string, InputField[]>()

  fields.forEach((field) => {
    const key = `${field.nodeId}-${field.nodeName}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(field)
  })

  return Array.from(grouped.entries()).map(([key, fields]) => ({
    nodeId: fields[0]!.nodeId,
    nodeName: fields[0]!.nodeName,
    fields,
  }))
}
