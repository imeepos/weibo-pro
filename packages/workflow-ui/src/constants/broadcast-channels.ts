/**
 * BroadcastChannel 频道名称常量
 *
 * 用于跨标签页通信的频道标识
 */

/**
 * 工作流剪贴板频道名称
 *
 * 用途：在多个浏览器标签页之间共享剪贴板数据
 * 消息类型：COPY_NODES, CUT_NODES, CLEAR_CLIPBOARD, REQUEST_CLIPBOARD, RESPONSE_CLIPBOARD
 */
export const WORKFLOW_CLIPBOARD_CHANNEL = 'workflow-clipboard'

/**
 * BroadcastChannel 消息类型常量
 */
export const BROADCAST_MESSAGE_TYPES = {
  /** 复制节点消息 */
  COPY_NODES: 'COPY_NODES',
  /** 剪切节点消息 */
  CUT_NODES: 'CUT_NODES',
  /** 清空剪贴板消息 */
  CLEAR_CLIPBOARD: 'CLEAR_CLIPBOARD',
  /** 请求剪贴板数据消息 */
  REQUEST_CLIPBOARD: 'REQUEST_CLIPBOARD',
  /** 响应剪贴板数据消息 */
  RESPONSE_CLIPBOARD: 'RESPONSE_CLIPBOARD',
} as const

/**
 * 剪贴板数据格式版本
 */
export const CLIPBOARD_DATA_VERSION = '1.0'

/**
 * 剪贴板数据过期时间（毫秒）
 *
 * 默认 1 小时后过期
 */
export const CLIPBOARD_EXPIRE_TIME = 60 * 60 * 1000

/**
 * 默认节点尺寸
 */
export const DEFAULT_NODE_SIZE = {
  width: 280,
  height: 120,
} as const
