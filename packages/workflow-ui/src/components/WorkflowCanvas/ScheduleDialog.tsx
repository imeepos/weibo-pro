'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Clock, Settings } from 'lucide-react'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,

} from '@sker/ui/components/ui/dialog'
import {
  Button,
} from '@sker/ui/components/ui/button'
import {
  ScheduleForm,
  type ScheduleFormData,
  type CronTemplate,
  type IntervalUnit,
} from '@sker/ui/components/ui/schedule-form'
import { WorkflowFormField, type InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'
import { WorkflowGraphAst, fromJson, getInputMetadata, resolveConstructor, SETTING_METHOD, type IEdge, Ast } from '@sker/workflow'
import { CronExpressionParser } from 'cron-parser'

// 类型定义
interface NodeSettingRenderer {
  (ast: any, onPropertyChange: (property: string, value: any) => void): React.ReactNode
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

/**
 * 调度对话框
 *
 * 存在即合理:
 * - 创建工作流调度任务
 * - 编辑现有调度配置
 * - 支持多种调度类型(Cron/间隔/一次性/手动)
 * - 自动计算下次执行时间
 * - 输入参数配置
 *
 * 优雅设计:
 * - 使用 @sker/ui Dialog 和 ScheduleForm 组件
 * - 表单验证清晰明了
 * - 响应式布局
 * - 编辑模式自动填充数据
 */
export interface ScheduleDialogProps {
  workflowName: string
  schedule?: WorkflowScheduleEntity | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

const CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '__custom__', description: '手动输入Cron表达式' },
]

const INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

export function ScheduleDialog({
  workflowName,
  schedule,
  open,
  onOpenChange,
  onSuccess
}: ScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: '',
    scheduleType: 'cron',
    cronExpression: '0 * * * *',
    intervalValue: 1,
    intervalUnit: 60,
    inputs: '{}',
  })
  const [workflowAst, setWorkflowAst] = useState<WorkflowGraphAst | null>(null)

  const client = root.get<WorkflowController>(WorkflowController)
  const isEditMode = !!schedule

  /**
   * 提取工作流入口节点的默认输入值
   *
   * 存在即合理：
   * - 扫描所有入度为 0 的节点（入口节点）
   * - 提取 @Input 装饰器的属性值
   * - 优先级：节点当前值 > 装饰器默认值
   *
   * 优雅设计：
   * - 复用 RunConfigDialog 的提取逻辑
   * - 返回结构化的 JSON 对象
   */
  const extractDefaultInputs = (workflow: WorkflowGraphAst): Record<string, unknown> => {
    const defaultInputs: Record<string, unknown> = {}

    if (!workflow?.nodes || !workflow?.edges) {
      return defaultInputs
    }

    // 找到所有入口节点（入度为 0）
    const entryNodes = workflow.nodes.filter((node) => {
      const hasIncomingEdges = workflow.edges.some((edge: IEdge) => edge.to === node.id)
      return !hasIncomingEdges
    })

    // 提取每个入口节点的 @Input 属性值
    entryNodes.forEach((astNode: any) => {
      try {
        const ctor = resolveConstructor(astNode)
        const inputMetadatas = getInputMetadata(ctor)
        const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

        metadataArray.forEach((metadata) => {
          const propKey = String(metadata.propertyKey)
          const fullKey = `${astNode.id}.${propKey}`

          // 优先使用节点当前值，否则使用装饰器默认值
          const nodeValue = astNode[propKey]
          const finalValue = nodeValue !== undefined ? nodeValue : metadata.defaultValue

          // 只添加有效值（排除 undefined）
          if (finalValue !== undefined) {
            defaultInputs[fullKey] = finalValue
          }
        })
      } catch (error) {
        console.warn('提取节点默认输入失败:', astNode.id, error)
      }
    })

    return defaultInputs
  }

  // 获取入口节点和 @Setting 渲染器
  const entryNodes = useMemo(() => {
    if (!workflowAst?.nodes || !workflowAst?.edges) {
      return []
    }

    // 优先使用 entryNodeIds，为空时回退到无入边节点
    return workflowAst.entryNodeIds?.length
      ? workflowAst.nodes.filter((node) => workflowAst.entryNodeIds.includes(node.id))
      : workflowAst.nodes.filter((node) => {
          const hasIncomingEdges = workflowAst.edges.some((edge: IEdge) => edge.to === node.id)
          return !hasIncomingEdges
        })
  }, [workflowAst])

  // 获取 @Setting 渲染器
  const settingRenderers = useMemo(() => {
    const renderers = new Map<string, NodeSettingRenderer>()

    entryNodes.forEach((node: any) => {
      try {
        const ctor = resolveConstructor(node)
        const settings = root.get(SETTING_METHOD, [])
        const setting = settings.find((s: any) => s.ast === ctor)
        if (setting) {
          const instance = root.get(setting.target)
          renderers.set(node.id, (instance as any)[setting.property].bind(instance))
        }
      } catch {
        // 忽略错误，回退到默认表单
      }
    })

    return renderers
  }, [entryNodes])

  // 解析当前 inputs JSON 为对象
  const parsedInputs = useMemo(() => {
    try {
      return JSON.parse(formData.inputs)
    } catch {
      return {}
    }
  }, [formData.inputs])

  // 提取所有带 @Input 装饰器的字段
  const inputFields = useMemo(() => {
    const fields: InputField[] = []

    entryNodes.forEach((node: any) => {
      const nodeName = node.name || node.metadata?.class?.title || node.type || '未命名节点'

      try {
        const ctor = resolveConstructor(node)
        const inputMetadatas = getInputMetadata(ctor)
        const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

        metadataArray.forEach((metadata) => {
          const propKey = String(metadata.propertyKey)
          const fullKey = `${node.id}.${propKey}`
          const currentValue = parsedInputs[fullKey]

          const fieldType: InputFieldType = metadata.type || inferFieldType(propKey, currentValue)
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
  }, [entryNodes, parsedInputs])

  // 处理输入参数变化
  const handleInputChange = (fullKey: string, value: any) => {
    const newInputs = { ...parsedInputs }
    newInputs[fullKey] = value
    setFormData(prev => ({ ...prev, inputs: JSON.stringify(newInputs, null, 2) }))
  }

  // 获取工作流 AST（用于提取默认输入）
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!open || isEditMode) return // 编辑模式不需要重新获取

      try {
        const workflow = await client.getWorkflow({ name: workflowName })
        if (workflow) {
          const ast = fromJson<WorkflowGraphAst>(workflow)
          setWorkflowAst(ast)
        }
      } catch (error) {
        console.error('获取工作流失败:', error)
      }
    }

    fetchWorkflow()
  }, [open, workflowName, isEditMode])

  // 编辑/新建模式下初始化表单数据
  useEffect(() => {
    if (schedule) {
      // 编辑模式：使用现有调度的配置
      const newFormData: ScheduleFormData = {
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        inputs: JSON.stringify(schedule.inputs || {}, null, 2),
        startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
        endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
      }

      if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
        newFormData.cronExpression = schedule.cronExpression
      }

      if (schedule.scheduleType === 'interval' && schedule.intervalSeconds) {
        const seconds = schedule.intervalSeconds
        if (seconds % 86400 === 0) {
          newFormData.intervalValue = seconds / 86400
          newFormData.intervalUnit = 86400
        } else if (seconds % 3600 === 0) {
          newFormData.intervalValue = seconds / 3600
          newFormData.intervalUnit = 3600
        } else if (seconds % 60 === 0) {
          newFormData.intervalValue = seconds / 60
          newFormData.intervalUnit = 60
        } else {
          newFormData.intervalValue = seconds
          newFormData.intervalUnit = 1
        }
      }

      setFormData(newFormData)
    } else if (workflowAst) {
      // 新建模式：自动提取入口节点的默认值
      const defaultInputs = extractDefaultInputs(workflowAst)
      const inputsJson = Object.keys(defaultInputs).length > 0
        ? JSON.stringify(defaultInputs, null, 2)
        : '{}'

      setFormData({
        name: '',
        scheduleType: 'cron',
        cronExpression: '0 * * * *',
        intervalValue: 1,
        intervalUnit: 60,
        inputs: inputsJson,  // 使用提取的默认值
      })
    }
  }, [schedule, workflowAst])

  useEffect(() => {
    calculateNextRunTime()
  }, [formData.scheduleType, formData.cronExpression, formData.intervalValue, formData.intervalUnit, formData.startTime])

  /**
   * 计算下次执行时间
   *
   * 存在即合理：
   * - once: 使用 startTime
   * - cron: 解析 cron 表达式计算下次执行时间
   * - interval: 当前时间 + 间隔时间
   * - manual: 无需计算（不自动执行）
   *
   * 优雅设计：
   * - 使用 cron-parser 库精确计算 cron 下次执行时间
   * - 错误处理：解析失败返回 undefined
   */
  const calculateNextRunTime = async () => {
    try {
      let calculatedNextRun: Date | undefined

      if (formData.scheduleType === 'once' && formData.startTime) {
        calculatedNextRun = formData.startTime
      } else if (formData.scheduleType === 'cron' && formData.cronExpression) {
        // 跳过自定义模板选项（用户尚未输入实际表达式）
        if (formData.cronExpression === '__custom__') {
          calculatedNextRun = undefined
        } else {
          try {
            // 使用 cron-parser 解析表达式并计算下次执行时间
            const interval = CronExpressionParser.parse(formData.cronExpression, {
              currentDate: formData.startTime || new Date(),
              tz: Intl.DateTimeFormat().resolvedOptions().timeZone // 使用本地时区
            })
            const next = interval.next()
            calculatedNextRun = next.toDate()
          } catch (error) {
            console.warn('Cron 表达式解析失败:', formData.cronExpression, error)
            calculatedNextRun = undefined
          }
        }
      } else if (formData.scheduleType === 'interval') {
        const intervalSeconds = (formData.intervalValue || 1) * (formData.intervalUnit || 60)
        const startTime = formData.startTime || new Date()
        calculatedNextRun = new Date(startTime.getTime() + intervalSeconds * 1000)
      }

      setFormData(prev => ({ ...prev, nextRunTime: calculatedNextRun }))
    } catch {
      setFormData(prev => ({ ...prev, nextRunTime: undefined }))
    }
  }

  const validateInputs = () => {
    if (!formData.name.trim()) {
      setError('调度名称不能为空')
      return false
    }

    try {
      const parsed = JSON.parse(formData.inputs)
      if (typeof parsed !== 'object' || parsed === null) {
        setError('输入参数必须是有效的 JSON 对象')
        return false
      }
    } catch {
      setError('输入参数必须是有效的 JSON 格式')
      return false
    }

    if (formData.scheduleType === 'cron' && (!formData.cronExpression || formData.cronExpression === '__custom__')) {
      setError('Cron 表达式不能为空')
      return false
    }

    if (formData.scheduleType === 'interval' && (!formData.intervalValue || formData.intervalValue <= 0)) {
      setError('间隔时间必须大于 0')
      return false
    }

    // 时间范围验证 - 仅对使用 startTime 的调度类型进行验证
    if ((formData.scheduleType === 'cron' || formData.scheduleType === 'interval')) {
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        setError('结束时间必须晚于开始时间')
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    setError('')

    if (!validateInputs()) {
      return
    }

    setLoading(true)

    try {
      const intervalSeconds = formData.scheduleType === 'interval'
        ? (formData.intervalValue || 1) * (formData.intervalUnit || 60)
        : undefined

      const cronExpr = formData.scheduleType === 'cron' && formData.cronExpression !== '__custom__'
        ? formData.cronExpression
        : undefined

      // 根据调度类型决定是否包含 startTime
      // 只有 manual 类型不需要 startTime（其他类型都有意义）
      const startTime = formData.scheduleType !== 'manual'
        ? formData.startTime
        : undefined

      if (isEditMode && schedule) {
        await client.updateSchedule(schedule.id, {
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime,
          endTime: formData.endTime,
        })
      } else {
        await client.createSchedule({
          code: workflowName,
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime,
          endTime: formData.endTime,
        })
      }

      onSuccess?.()
      onOpenChange?.(false)

      if (!isEditMode) {
        setFormData({
          name: '',
          scheduleType: 'cron',
          cronExpression: '0 * * * *',
          intervalValue: 1,
          intervalUnit: 60,
          inputs: '{}',
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || (isEditMode ? '更新调度失败' : '创建调度失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="bg-secondary text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <Clock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>
                {isEditMode ? '编辑工作流调度' : '创建工作流调度'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? '修改工作流的自动执行计划配置' : '设置工作流的自动执行计划,支持多种调度方式'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 mb-4 rounded-lg border p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <ScheduleForm
            data={formData}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            cronTemplates={CRON_TEMPLATES}
            intervalUnits={INTERVAL_UNITS}
          />

          {/* 可视化参数配置区域 */}
          {inputFields.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  <h3 className="text-sm font-semibold">参数配置</h3>
                </div>
              </div>

              {groupFieldsByNode(inputFields).map(({ nodeId, nodeName, fields }) => {
                const customSetting = settingRenderers.get(nodeId)
                const node = workflowAst?.nodes.find((n: any) => n.id === nodeId)

                return (
                  <div key={nodeId} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <h4 className="text-sm font-semibold text-foreground">{nodeName}</h4>
                      <span className="text-xs text-muted-foreground">({fields.length} 个参数)</span>
                    </div>
                    <div className="pl-4">
                      {customSetting && node ? (
                        customSetting(node, (prop, value) => {
                          handleInputChange(`${nodeId}.${prop}`, value)
                        })
                      ) : (
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

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '创建调度')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
