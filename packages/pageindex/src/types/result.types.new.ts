/**
 * PageIndex 结果类型定义
 *
 * 按照 data-structures.md 定义,使用 snake_case 命名
 */

import type { Node } from './node.types.new.js';

/**
 * 页面文本和 token 计数
 */
export interface PageToken {
  /** 页面文本 */
  text: string;

  /** token 数量 */
  tokenCount: number;
}

/**
 * 目录项
 */
export interface TOCItem {
  /** 结构编号 (如 '1.1.2') */
  structure: string | null;

  /** 标题 */
  title: string;

  /** 目录页码 */
  page?: number;

  /** 物理页码 */
  physical_index?: number | string;

  /** 列表索引 (验证时使用) */
  list_index?: number;

  /** 是否在页首 */
  appear_start?: 'yes' | 'no';
}

/**
 * 索引结果
 */
export interface PageIndexResult {
  /** 文档名称 */
  doc_name: string;

  /** 文档描述 (可选) */
  doc_description?: string;

  /** 文档结构树 */
  structure: Node[];
}

/**
 * 验证结果
 */
export interface VerifyResult {
  /** 标题是否出现在指定页 */
  answer: 'yes' | 'no';

  /** 标题 */
  title: string;

  /** 页码 */
  page_number: number | null;

  /** 在列表中的索引 */
  list_index: number;
}

/**
 * 错误结果
 */
export interface IncorrectResult {
  /** 在列表中的索引 */
  list_index: number;

  /** 标题 */
  title: string;

  /** 错误的物理页码 */
  physical_index: number;
}
