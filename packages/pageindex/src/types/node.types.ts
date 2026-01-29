/**
 * PageIndex 节点类型定义
 *
 * 定义了文档树结构中的节点类型
 */

/**
 * 文档节点
 *
 * 表示文档树中的一个节点，可以是章节、节、小节等
 * 节点可以递归包含子节点，形成树形结构
 */
export interface Node {
  /**
   * 节点标题
   * 唯一必需字段
   */
  title: string

  /**
   * 节点ID
   * 格式为4位数字填充，如 "0001", "0002"
   * 由系统自动生成，用于唯一标识节点
   * @optional
   */
  node_id?: string

  /**
   * 层级结构标识
   * 表示节点在文档中的层级位置，如 "1.1.2"
   * 主要用于PDF文档
   * @optional
   */
  structure?: string

  /**
   * 物理页码（PDF）
   * 节点在PDF文档中的实际页码
   * 可能为null（未确定或不存在）
   * @optional
   * @nullable
   */
  physical_index?: number | null

  /**
   * 起始页码/索引
   * 节点内容的起始位置
   * PDF中为页码，Markdown中为行号
   * @optional
   */
  start_index?: number

  /**
   * 结束页码/索引
   * 节点内容的结束位置
   * PDF中为页码，Markdown中为行号
   * @optional
   */
  end_index?: number

  /**
   * 节点文本内容
   * 节点的完整文本内容
   * @optional
   */
  text?: string

  /**
   * 节点摘要
   * 节点内容的简要概括
   * 对于叶子节点，这是节点内容的摘要
   * 对于父节点，这是节点自身内容的摘要（不包含子节点）
   * @optional
   */
  summary?: string

  /**
   * 前缀摘要
   * 仅用于父节点
   * 这是节点自身的摘要，不包括子节点的内容
   * @optional
   */
  prefix_summary?: string

  /**
   * 行号（Markdown）
   * 节点标题在Markdown文件中的行号
   * @optional
   */
  line_num?: number

  /**
   * 标题层级（Markdown）
   * 表示标题的级别，1-6对应#到######
   * @optional
   */
  level?: number

  /**
   * Token数量
   * 节点文本的token计数
   * @optional
   */
  text_token_count?: number

  /**
   * 页码（PDF）
   * 节点所在的页码
   * 可能为null（未确定或不存在）
   * @optional
   * @nullable
   */
  page?: number | null

  /**
   * 是否在页面开头
   * 标记节点的标题是否在页面开头出现
   * 用于PDF TOC验证
   * @optional
   */
  appear_start?: 'yes' | 'no'

  /**
   * 子节点列表
   * 递归结构，包含该节点的所有直接子节点
   * @optional
   */
  nodes?: Node[]
}

/**
 * 扁平化节点列表
 *
 * 将树形结构的节点列表扁平化为一维数组
 */
export type FlatNodeList = Node[]

/**
 * 树形结构
 *
 * 嵌套的节点树
 */
export type TreeStructure = Node[]

/**
 * 节点在列表中的索引
 *
 * 用于跟踪节点在扁平化列表中的位置
 */
export interface NodeWithListIndex extends Node {
  /**
   * 节点在列表中的索引
   */
  list_index?: number
}
