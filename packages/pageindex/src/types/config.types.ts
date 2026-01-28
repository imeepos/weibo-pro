/**
 * PageIndex 配置类型定义
 *
 * 定义了PDF和Markdown文档处理的配置选项
 */

/**
 * PDF文档处理配置
 *
 * 用于配置PDF文档的索引生成过程
 */
export interface PDFConfig {
  /**
   * OpenAI模型名称
   * @default 'gpt-4o-2024-11-20'
   */
  model: string

  /**
   * 检查目录(TOC)的页数
   * @default 20
   */
  tocCheckPageNum: number

  /**
   * 每个节点最大页数
   * 超过此限制的节点会被递归分割
   * @default 10
   */
  maxPageNumEachNode: number

  /**
   * 每个节点最大token数
   * 超过此限制的节点会被递归分割
   * @default 20000
   */
  maxTokenNumEachNode: number

  /**
   * 是否为节点添加唯一ID
   * 格式为4位数字填充，如 "0001", "0002"
   * @default 'yes'
   */
  ifAddNodeId: 'yes' | 'no'

  /**
   * 是否为节点生成摘要
   * @default 'yes'
   */
  ifAddNodeSummary: 'yes' | 'no'

  /**
   * 是否为文档生成整体描述
   * @default 'no'
   */
  ifAddDocDescription: 'yes' | 'no'

  /**
   * 是否在节点中包含完整文本
   * @default 'no'
   */
  ifAddNodeText: 'yes' | 'no'
}

/**
 * Markdown文档处理配置
 *
 * 用于配置Markdown文档的索引生成过程
 */
export interface MarkdownConfig {
  /**
   * OpenAI模型名称
   * @default 'gpt-4o-2024-11-20'
   */
  model: string

  /**
   * 是否应用树剪枝(thinning)
   * 合并过小的节点到父节点
   * @default false
   */
  ifThinning: boolean

  /**
   * 树剪枝的token阈值
   * token数小于此值的节点会被合并
   * @default 5000
   */
  thinningThreshold: number

  /**
   * 生成摘要的token阈值
   * 节点文本token数超过此值时才生成摘要
   * @default 200
   */
  summaryTokenThreshold: number

  /**
   * 是否为节点添加唯一ID
   * @default 'yes'
   */
  ifAddNodeId: 'yes' | 'no'

  /**
   * 是否为节点生成摘要
   * @default 'yes'
   */
  ifAddNodeSummary: 'yes' | 'no'

  /**
   * 是否为文档生成整体描述
   * @default 'no'
   */
  ifAddDocDescription: 'yes' | 'no'

  /**
   * 是否在节点中包含完整文本
   * @default 'no'
   */
  ifAddNodeText: 'yes' | 'no'
}

/**
 * 联合配置类型
 *
 * 可以是PDF配置或Markdown配置
 */
export type Config = PDFConfig | MarkdownConfig

/**
 * 类型守卫：检查是否为PDF配置
 */
export function isPDFConfig(config: Config): config is PDFConfig {
  return 'tocCheckPageNum' in config
}

/**
 * 类型守卫：检查是否为Markdown配置
 */
export function isMarkdownConfig(config: Config): config is MarkdownConfig {
  return 'ifThinning' in config
}
