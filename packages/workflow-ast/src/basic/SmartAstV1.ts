import { Ast, Input, Node, Output, State } from '@sker/workflow'

/**
 * 通用数据项 - 分发的基本单元
 */
export interface DataItem {
  id: string
  data: unknown
  metadata?: Record<string, unknown>
  summary?: string
}

/**
 * 解析状态
 */
export type ParseStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

/**
 * 元数据摘要
 */
export interface MetadataSummary {
  dataType: string
  totalCount: number
  structure: string
  keyFields: string[]
}

/**
 * SmartAstV1 - 通用智能分发节点
 *
 * 通过 LLM 理解任意格式的输入数据，将其拆解并分发到下游节点
 *
 * @example
 * // 输入: Markdown 书籍目录
 * // 输出: 每个章节作为独立的 DataItem 分发
 *
 * @example
 * // 输入: JSON 数组
 * // 输出: 每个数组元素作为独立的 DataItem 分发
 */
@Node({
  title: '智能分发器',
  type: 'control',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 1000,
  retryBackoff: 2,
  dynamicOutputs: true,
  dynamicInputs: true
})
export class SmartAstV1 extends Ast {
  // ==================== 输入端口 ====================

  @Input({
    title: '输入数据',
    type: 'any',
    defaultValue: null,
    description: '待处理的原始数据，可以是字符串、JSON、数组或任意对象'
  })
  inputData: unknown = null

  @Input({
    title: '系统提示词',
    type: 'textarea',
    defaultValue: '你是一个数据分析和分发专家。通过工具调用理解数据结构，将数据拆分为可独立处理的项。',
    description: '指导 LLM 如何分析和处理数据的系统提示'
  })
  systemPrompt: string = '你是一个数据分析和分发专家。通过工具调用理解数据结构，将数据拆分为可独立处理的项。'

  @Input({
    title: 'LLM 模型',
    defaultValue: 'deepseek-ai/DeepSeek-V3.2',
    description: '用于分析和分发数据的大模型'
  })
  model: string = 'deepseek-ai/DeepSeek-V3.2'

  @Input({
    title: '温度参数',
    type: 'number',
    defaultValue: 0.3,
    description: 'LLM 生成的随机性，较低值使输出更确定'
  })
  temperature: number = 0.3

  @Input({
    title: '最大项数',
    type: 'number',
    defaultValue: 50,
    description: '最多拆分出的数据项数量（防止过度拆分）'
  })
  maxItems: number = 50

  // ==================== 状态字段 ====================

  @State({ title: '解析状态' })
  parseStatus: ParseStatus = 'pending'

  @State({ title: '识别的数据类型' })
  detectedDataType: string = ''

  @State({ title: '总项数' })
  totalItems: number = 0

  @State({ title: '已分发项数' })
  dispatchedItems: number = 0

  @State({ title: '分析耗时(ms)' })
  analysisDuration: number = 0

  // ==================== 输出端口 ====================

  @Output({
    title: '分发项',
    defaultValue: null,
    description: '单个分发项的数据（DataItem 类型），每次发射触发下游节点执行'
  })
  dispatchItem: DataItem | null = null

  @Output({
    title: '所有项',
    defaultValue: [],
    description: '完整的分发项列表（数组形式）'
  })
  allItems: DataItem[] = []

  @Output({
    title: '元数据摘要',
    defaultValue: null,
    description: '数据结构和内容的分析摘要'
  })
  metadataSummary: MetadataSummary | null = null

  @Output({
    title: '流式输出',
    defaultValue: null,
    description: 'LLM 的实时响应文本（用于调试和监控）'
  })
  stdout: string | null = null

  @Output({
    title: '分发完成',
    type: 'boolean',
    defaultValue: false,
    isRouter: true,
    description: '所有项分发完成时触发'
  })
  dispatchComplete: boolean = false

  type: 'SmartAstV1' = 'SmartAstV1'
}
