import { SerializedError } from '@sker/core';
import { generateId } from '../utils';
import { IAstStates } from '../types';

/**
 * 节点执行状态
 *
 * 存在即合理：
 * - 将节点状态从 AST 实例中分离出来
 * - 每次执行创建独立的状态副本
 * - 支持同一 AST 实例的并发执行
 */
export interface NodeExecutionState {
    /** 节点状态 */
    state: IAstStates;
    /** 错误信息 */
    error?: SerializedError;
    /** 执行次数 */
    count: number;
    /** 发射次数 */
    emitCount: number;
}

/**
 * 执行上下文 - 隔离每次工作流执行的状态
 *
 * 存在即合理：
 * - 解决同一 AST 实例并发执行时的状态竞争问题
 * - 每次执行创建独立的上下文，状态互不干扰
 * - 支持追踪和调试每次执行
 *
 * 优雅设计：
 * - 使用 Map 存储节点状态，O(1) 查找
 * - 惰性初始化，只在访问时创建状态
 * - 不修改原始 AST，保持数据不可变性
 *
 * 使用方式：
 * ```ts
 * const ctx = new ExecutionContext();
 * const nodeState = ctx.getNodeState(nodeId);
 * nodeState.state = 'running';
 * ```
 */
export class ExecutionContext {
    /** 执行唯一标识 */
    readonly executionId: string;

    /** 节点状态映射 */
    private readonly nodeStates = new Map<string, NodeExecutionState>();

    /** 执行开始时间 */
    readonly startTime: Date;

    /** 父上下文（用于子工作流） */
    readonly parent?: ExecutionContext;

    constructor(parent?: ExecutionContext) {
        this.executionId = generateId();
        this.startTime = new Date();
        this.parent = parent;
    }

    /**
     * 获取节点执行状态（惰性初始化）
     *
     * @param nodeId 节点 ID
     * @returns 节点执行状态
     */
    getNodeState(nodeId: string): NodeExecutionState {
        let state = this.nodeStates.get(nodeId);
        if (!state) {
            state = {
                state: 'pending',
                count: 0,
                emitCount: 0
            };
            this.nodeStates.set(nodeId, state);
        }
        return state;
    }

    /**
     * 检查节点状态是否存在
     */
    hasNodeState(nodeId: string): boolean {
        return this.nodeStates.has(nodeId);
    }

    /**
     * 获取所有节点状态（用于调试）
     */
    getAllNodeStates(): Map<string, NodeExecutionState> {
        return new Map(this.nodeStates);
    }

    /**
     * 获取执行时长（毫秒）
     */
    getDuration(): number {
        return Date.now() - this.startTime.getTime();
    }

    /**
     * 创建子上下文（用于子工作流执行）
     */
    createChildContext(): ExecutionContext {
        return new ExecutionContext(this);
    }

    /**
     * 将上下文状态同步回 AST 节点
     *
     * 用于执行完成后更新 AST 状态（可选，用于 UI 显示）
     *
     * @param nodes 节点列表
     */
    syncToNodes(nodes: Array<{ id: string; state: IAstStates; error?: SerializedError; count: number; emitCount: number }>): void {
        for (const node of nodes) {
            const state = this.nodeStates.get(node.id);
            if (state) {
                node.state = state.state;
                node.error = state.error;
                node.count = state.count;
                node.emitCount = state.emitCount;
            }
        }
    }
}
