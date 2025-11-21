import { WorkflowEdge } from './WorkflowEdge'

export { WorkflowEdge } from './WorkflowEdge'

/**
 * 边类型注册
 *
 * 优雅设计：
 * - 使用单一组件处理所有边类型
 * - 组件内部根据 data.edgeType 自动适配样式
 */
export const edgeTypes = {
  'workflow-data-edge': WorkflowEdge,
  'workflow-control-edge': WorkflowEdge,
}
