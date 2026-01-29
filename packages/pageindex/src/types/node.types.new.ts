/**
 * PageIndex 节点类型定义
 *
 * 按照 data-structures.md 定义,使用 snake_case 命名
 */

/**
 * 文档树节点
 */
export interface Node {
  /** 节点标题 */
  title: string;

  /** 节点 ID (如 '0001', '0002') */
  node_id?: string;

  /** 结构编号 (如 '1.1.2',仅 PDF) */
  structure?: string;

  /** 物理页码 (PDF) */
  physical_index?: number;

  /** 起始页码 */
  start_index?: number;

  /** 结束页码 */
  end_index?: number;

  /** 行号 (Markdown) */
  line_num?: number;

  /** 节点文本内容 */
  text?: string;

  /** 节点摘要 */
  summary?: string;

  /** 前缀摘要 (父节点) */
  prefix_summary?: string;

  /** 标题级别 (Markdown 1-6) */
  level?: number;

  /** 子节点列表 */
  nodes?: Node[];

  /** 是否在页首 (内部使用) */
  appear_start?: 'yes' | 'no';

  /** 目录页码 (内部使用) */
  page?: number;
}
