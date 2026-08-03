import type { IEdge, WorkflowGraphAst } from '@sker/workflow'
import { getInputMetadata, resolveConstructor } from '@sker/workflow'
import type { InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'
import type { InputField } from './run-config-dialog.types'

/**
 * 识别入口节点
 *
 * 优先使用 entryNodeIds，为空时回退到自动识别（无入边节点）
 */
export function findEntryNodes(workflow: WorkflowGraphAst): any[] {
  if (!workflow?.nodes || !workflow?.edges) {
    return []
  }

  return workflow.entryNodeIds?.length
    ? workflow.nodes.filter((node) => workflow.entryNodeIds.includes(node.id))
    : workflow.nodes.filter((node) => {
        const hasIncomingEdges = workflow.edges.some((edge: IEdge) => edge.to === node.id)
        return !hasIncomingEdges
      })
}

/**
 * 从工作流 AST 收集入口节点的输入值
 *
 * 优先使用 entryNodeIds，为空时回退到自动识别（无入边节点）
 */
export function collectInputsFromWorkflow(
  workflow: WorkflowGraphAst,
  defaultInputs: Record<string, unknown>
): Record<string, unknown> {
  const normalizedInputs: Record<string, unknown> = {}

  const startNodes = findEntryNodes(workflow)

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

/**
 * 智能推断字段类型
 * 优雅设计：根据属性名和值推断最合适的输入类型（作为 @Input type 的备选）
 */
export function inferFieldType(propKey: string, value: any): InputFieldType {
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
export function formatLabel(key: string): string {
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
export function getPlaceholder(propKey: string, type: InputFieldType): string {
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
export function groupFieldsByNode(fields: InputField[]): Array<{ nodeId: string; nodeName: string; fields: InputField[] }> {
  const grouped = new Map<string, InputField[]>()

  fields.forEach((field) => {
    const key = `${field.nodeId}-${field.nodeName}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(field)
  })

  return Array.from(grouped.entries()).map(([_key, fields]) => ({
    nodeId: fields[0]!.nodeId,
    nodeName: fields[0]!.nodeName,
    fields,
  }))
}
