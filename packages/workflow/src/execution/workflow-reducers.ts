import type { WorkflowGraphAst } from '../ast';
import { setAstError } from '../ast';
import type { INode } from '../types';

/**
 * 节点更新事件
 */
export interface NodeUpdateEvent {
  nodeId: string;
  updates: Partial<INode>;
}

/**
 * updateNodeReducer - 更新单个节点状态
 *
 * 纯函数，借鉴 @sker/store 的 reducer 模式
 * 接收工作流当前状态和节点更新事件，返回新的工作流状态
 *
 * 核心逻辑：
 * 1. 查找目标节点
 * 2. 合并更新内容
 * 3. 计算节点计数器（count/emitCount）
 * 4. 返回不可变更新后的工作流状态
 *
 * @param workflow 当前工作流状态
 * @param event 节点更新事件
 * @returns 新的工作流状态
 */
export function updateNodeReducer(
  workflow: WorkflowGraphAst,
  event: NodeUpdateEvent
): WorkflowGraphAst {
  const nodeIndex = workflow.nodes.findIndex(n => n.id === event.nodeId);
  if (nodeIndex === -1) {
    return workflow; // 节点不存在，返回原状态
  }

  const existingNode = workflow.nodes[nodeIndex]!;
  const updatedNode = { ...existingNode, ...event.updates };

  // 计算节点计数器（纯函数）
  const counters = computeNodeCounters(existingNode, updatedNode);

  // 不可变更新（保持原型链）
  const newNodes = workflow.nodes.map((node, idx) =>
    idx === nodeIndex ? { ...updatedNode, ...counters } : node
  );

  // 使用 Object.assign 保持原型链（确保 getter 可用）
  return Object.assign(
    Object.create(Object.getPrototypeOf(workflow)),
    workflow,
    {
      nodes: newNodes,
      state: 'running' as const,
    }
  );
}

/**
 * computeNodeCounters - 计算节点计数器
 *
 * 纯函数，根据节点状态变化计算 count 和 emitCount
 *
 * 计数规则：
 * - emitCount: 每次发射 running 状态 +1（BehaviorSubject 发射事件计数）
 * - count: 每次发射 success 或 fail 状态 +1（完整执行计数）
 *
 * @param existing 现有节点状态
 * @param updated 更新后的节点状态
 * @returns 计数器对象
 */
function computeNodeCounters(
  existing: INode,
  updated: INode
): { count: number; emitCount: number } {
  let count = existing.count;
  let emitCount = existing.emitCount;

  // running 状态：输出事件计数（替代原 emitting 状态）
  if (updated.state === 'running' && existing.state !== 'running') {
    emitCount += 1;
  }

  // success/fail 状态：完整执行计数
  if (updated.state === 'success' || updated.state === 'fail') {
    count += 1;
  }

  return { count, emitCount };
}

/**
 * finalizeWorkflowReducer - 完成工作流执行
 *
 * 纯函数，根据所有节点的最终状态计算工作流整体状态
 *
 * 完成规则：
 * - 所有节点都成功 → 工作流 success
 * - 任一节点失败 → 工作流 fail
 *
 * @param workflow 当前工作流状态
 * @returns 最终化后的工作流状态
 */
export function finalizeWorkflowReducer(
  workflow: WorkflowGraphAst
): WorkflowGraphAst {
  const hasFailures = workflow.nodes.some(n => n.state === 'fail');

  // 使用 Object.assign 保持原型链
  return Object.assign(
    Object.create(Object.getPrototypeOf(workflow)),
    workflow,
    {
      state: hasFailures ? ('fail' as const) : ('success' as const),
    }
  );
}

/**
 * failWorkflowReducer - 标记工作流失败
 *
 * 纯函数，处理工作流执行过程中的错误
 *
 * @param workflow 当前工作流状态
 * @param error 错误对象
 * @returns 标记为失败的工作流状态
 */
export function failWorkflowReducer(
  workflow: WorkflowGraphAst,
  error: any
): WorkflowGraphAst {
  // 使用 Object.assign 保持原型链
  const failedWorkflow = Object.assign(
    Object.create(Object.getPrototypeOf(workflow)),
    workflow,
    {
      state: 'fail' as const,
    }
  );
  setAstError(failedWorkflow, error);
  return failedWorkflow;
}

/**
 * resetWorkflowReducer - 重置工作流状态
 *
 * 纯函数，将工作流和所有节点重置为初始状态
 *
 * @param workflow 当前工作流状态
 * @returns 重置后的工作流状态
 */
export function resetWorkflowReducer(
  workflow: WorkflowGraphAst
): WorkflowGraphAst {
  const resetNodes = workflow.nodes.map(node => ({
    ...node,
    state: 'pending' as const,
    count: 0,
    emitCount: 0,
    error: undefined,
  }));

  // 使用 Object.assign 保持原型链
  return Object.assign(
    Object.create(Object.getPrototypeOf(workflow)),
    workflow,
    {
      state: 'pending' as const,
      nodes: resetNodes,
    }
  );
}
