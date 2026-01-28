/**
 * PageIndex 结果类型定义
 *
 * 定义了文档处理结果的返回类型
 */

import type { Node } from './node.types.js';

/**
 * 文档处理结果
 *
 * 文档索引生成的最终输出
 */
export interface DocumentResult {
  /**
   * 文档名称
   * 对于PDF，通常是文件名或元数据中的标题
   * 对于Markdown，是文件名（不含扩展名）
   */
  doc_name: string

  /**
   * 文档描述
   * 对整个文档的简要概括
   * 仅在配置中启用时生成
   * @optional
   */
  doc_description?: string

  /**
   * 文档结构树
   * 根节点数组，表示文档的完整层次结构
   */
  structure: Node[]
}

/**
 * 页面Token信息
 *
 * 表示PDF某一页的文本和token计数
 */
export interface PageToken {
  /**
   * 页面文本内容
   */
  text: string

  /**
   * Token数量
   * 使用指定模型的tokenizer计算的token数
   */
  tokenCount: number
}

/**
 * 页面Token元组
 *
 * 用于函数返回值，[文本, token数]
 */
export type PageTokenTuple = [string, number]

/**
 * TOC（目录）检测结果
 *
 * 包含目录内容和相关信息
 */
export interface TOCResult {
  /**
   * 目录内容
   * 如果检测到目录则包含目录文本，否则为null
   * @nullable
   */
  toc_content: string | null

  /**
   * 目录所在的页码列表
   * 记录目录出现的所有页码
   */
  toc_page_list: number[]

  /**
   * 目录中是否包含页码索引
   * "yes" - 目录包含页码
   * "no" - 目录不包含页码
   */
  page_index_given_in_toc: 'yes' | 'no'
}

/**
 * 目录检测结果（详细）
 *
 * 包含更详细的目录检测信息
 */
export interface TOCDetectionResult extends TOCResult {
  /**
   * 是否检测到目录
   */
  toc_detected: boolean

  /**
   * 检查的总页数
   */
  checked_pages: number
}

/**
 * 标题验证结果
 *
 * 验证标题是否在指定页面出现的结果
 */
export interface TitleVerificationResult {
  /**
   * 节点在列表中的索引
   */
  list_index: number

  /**
   * 标题是否出现在页面中
   */
  answer: 'yes' | 'no'

  /**
   * 节点标题
   */
  title: string

  /**
   * 页码
   * 可能不存在（节点没有physical_index）
   */
  page_number: number | null
}

/**
 * 文档元数据
 *
 * 从文档中提取的元信息
 */
export interface DocumentMetadata {
  /**
   * 文档标题
   */
  title?: string

  /**
   * 文档作者
   */
  author?: string

  /**
   * 文档创建日期
   */
  creation_date?: string

  /**
   * 文档修改日期
   */
  modification_date?: string

  /**
   * 总页数（PDF）
   */
  total_pages?: number

  /**
   * 总token数
   */
  total_tokens?: number
}

/**
 * 目录项
 *
 * 表示目录中的一个条目
 */
export interface TOCItem {
  /**
   * 结构编号 (如 '1.1.2')
   */
  structure: string | null

  /**
   * 标题
   */
  title: string

  /**
   * 目录页码
   */
  page?: number

  /**
   * 物理页码
   */
  physical_index?: number | string

  /**
   * 列表索引 (验证时使用)
   */
  list_index?: number

  /**
   * 是否在页首
   */
  appear_start?: 'yes' | 'no'
}

/**
 * 索引结果（别名，与DocumentResult相同）
 *
 * @deprecated 使用 DocumentResult 代替
 */
export type PageIndexResult = DocumentResult
