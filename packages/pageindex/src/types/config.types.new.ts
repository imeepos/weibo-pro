/**
 * PageIndex 配置类型定义
 *
 * 按照 data-structures.md 定义,使用 snake_case 命名
 */

/**
 * 配置接口
 */
export interface Config {
  /** OpenAI 模型名称 */
  model: string;

  /** 检查 TOC 的最大页数 */
  toc_check_page_num: number;

  /** 每个节点的最大页数 */
  max_page_num_each_node: number;

  /** 每个节点的最大 token 数 */
  max_token_num_each_node: number;

  /** 是否添加节点 ID */
  if_add_node_id: 'yes' | 'no';

  /** 是否生成节点摘要 */
  if_add_node_summary: 'yes' | 'no';

  /** 是否生成文档描述 */
  if_add_doc_description: 'yes' | 'no';

  /** 是否包含节点文本 */
  if_add_node_text: 'yes' | 'no';
}

/**
 * 配置输入类型(所有字段可选)
 */
export type ConfigInput = Partial<Config>;
