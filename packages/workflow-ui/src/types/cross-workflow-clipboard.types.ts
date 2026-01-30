import type { INode, IEdge } from '@sker/workflow'

/**
 * 包围盒 - 用于计算节点组的边界和中心点
 *
 * 用途：
 * - 计算多个节点的整体边界
 * - 确定粘贴时的中心位置
 * - 计算节点相对于中心的偏移量
 */
export interface BoundingBox {
  /** 最小 X 坐标 */
  minX: number
  /** 最小 Y 坐标 */
  minY: number
  /** 最大 X 坐标 */
  maxX: number
  /** 最大 Y 坐标 */
  maxY: number
  /** 包围盒宽度 */
  width: number
  /** 包围盒高度 */
  height: number
  /** 包围盒中心 X 坐标 */
  centerX: number
  /** 包围盒中心 Y 坐标 */
  centerY: number
}

/**
 * 序列化的节点数据
 *
 * 仅包含可序列化的必要字段，避免循环引用和不可序列化数据
 */
export interface SerializedNode {
  /** 节点ID（原始ID，用于调试） */
  id: string
  /** 节点类型 */
  type: string
  /** 节点数据（INode 的可序列化部分） */
  data: Omit<Partial<INode>, 'metadata'>
  /** 位置坐标 */
  position: {
    x: number
    y: number
  }
  /** 节点宽度（用于包围盒计算） */
  width?: number
  /** 节点高度（用于包围盒计算） */
  height?: number
}

/**
 * 序列化的边数据
 *
 * 仅包含可序列化的必要字段
 */
export interface SerializedEdge {
  /** 边ID */
  id: string
  /** 源节点ID */
  from: string
  /** 目标节点ID */
  to: string
  /** 源输出属性 */
  fromProperty?: string
  /** 目标输入属性 */
  toProperty?: string
  /** 边权重 */
  weight?: number
  /** 流式合并模式 */
  mode?: string
  /** 是否为主流 */
  isPrimary?: boolean
  /** 数据转换表达式 */
  transform?: string
}

/**
 * 跨工作流剪贴板数据格式
 *
 * 标准化的剪贴板数据结构，支持跨标签页传输
 * 使用 BroadcastChannel API 传输，数据必须可序列化
 *
 * 版本: 1.0
 */
export interface CrossWorkflowClipboardData {
  /** 格式版本（用于向后兼容） */
  version: '1.0'
  /** 来源工作流ID */
  sourceWorkflowId: string
  /** 来源工作流名称（用户友好显示） */
  sourceWorkflowName?: string
  /** 复制时间戳 */
  timestamp: number
  /** 序列化的节点列表 */
  nodes: SerializedNode[]
  /** 序列化的边列表 */
  edges: SerializedEdge[]
  /** 元数据（用于调试和UI显示） */
  metadata?: {
    /** 节点数量 */
    nodeCount: number
    /** 边数量 */
    edgeCount: number
    /** 包围盒（用于位置计算） */
    boundingBox?: BoundingBox
  }
}

/**
 * BroadcastChannel 消息类型
 */
export type BroadcastChannelMessageType =
  | 'COPY_NODES'
  | 'CUT_NODES'
  | 'CLEAR_CLIPBOARD'
  | 'REQUEST_CLIPBOARD'
  | 'RESPONSE_CLIPBOARD'

/**
 * BroadcastChannel 消息格式
 */
export interface BroadcastChannelMessage {
  /** 消息类型 */
  type: BroadcastChannelMessageType
  /** 来源工作流ID */
  sourceWorkflowId: string
  /** 来源工作流名称 */
  sourceWorkflowName?: string
  /** 消息时间戳 */
  timestamp: number
  /** 剪贴板数据（COPY_NODES, CUT_NODES, RESPONSE_CLIPBOARD 时使用） */
  data?: CrossWorkflowClipboardData
}

/**
 * 跨工作流剪贴板状态
 */
export interface CrossWorkflowClipboardState {
  /** 剪贴板数据 */
  data: CrossWorkflowClipboardData | null
  /** 最后更新时间 */
  lastUpdate: number
}

/**
 * 节点尺寸信息
 */
export interface NodeSize {
  width: number
  height: number
}
