/**
 * 工作流工厂 - 提供创建和操作工作流的纯函数
 *
 * 按职责拆分：
 * - 创建：workflow-factory-create.ts
 * - 转换（克隆/合并/提取）：workflow-factory-transform.ts
 * - 分析（统计/孤立/入口/出口）：workflow-factory-analyze.ts
 */

export { createEmptyWorkflow, createWorkflowFromJson } from './workflow-factory-create'
export { cloneWorkflow, mergeWorkflows, extractSubWorkflow } from './workflow-factory-transform'
export {
  getWorkflowStats,
  findIsolatedNodes,
  findEntryNodes,
  findExitNodes,
} from './workflow-factory-analyze'
