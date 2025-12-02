import type { IAstStates } from '@sker/workflow'
import type { Position } from '@xyflow/react'

/**
 * 节点状态视觉映射
 * @deprecated 使用 @sker/ui 包中的 NODE_STATE_COLORS
 */
export { NODE_STATE_COLORS } from '@sker/ui/constants/workflow'

/**
 * 节点状态标签
 * @deprecated 使用 @sker/ui 包中的 NODE_STATE_LABELS
 */
export { NODE_STATE_LABELS } from '@sker/ui/constants/workflow'

/**
 * 节点句柄配置
 */
export interface NodeHandleConfig {
  property: string
  type: 'source' | 'target'
  position: Position
  label: string
  isMulti?: boolean
}
