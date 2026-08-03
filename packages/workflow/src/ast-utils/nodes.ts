import type { Ast } from "../ast";
import { INode } from "../types";

// ============================================
// WorkflowGraphAst 节点管理工具函数
// ============================================

/**
 * 判断是否为分组节点
 *
 * 优雅设计：
 * - 分组节点 = 没有执行入口的 WorkflowGraphAst
 * - 可执行工作流 = 有执行入口的 WorkflowGraphAst
 * - 不需要额外的标记字段，通过语义判断
 */
export function isWorkflowGroup(workflow: Ast): boolean {
    return workflow.type === `WorkflowGraphAst`
}

/**
 * 检查节点是否存在（递归查找分组内节点）
 */
export function hasNode(nodes: INode[], id: string): boolean {
    for (const node of nodes) {
        if (node.id === id) return true;
        if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
            if (hasNode((node as any).nodes, id)) return true;
        }
    }
    return false;
}

/**
 * 根据 ID 获取节点（递归查找组节点内部）
 *
 * 优雅设计：
 * - 与 hasNode 保持一致，支持递归查找
 * - 自动遍历 WorkflowGraphAst 组节点的子节点
 */
export function getNodeById<T extends INode = INode>(nodes: INode[], id: string): T | undefined {
    for (const node of nodes) {
        if (node.id === id) return node as T;

        // 递归查找组节点内部
        if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
            const found = getNodeById<T>((node as any).nodes, id);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * 根据类型获取节点
 */
export function getNodesByType<T extends INode = INode>(nodes: INode[], type: string): T[] {
    return nodes.filter(node => node.type === type) as T[];
}

/**
 * 添加节点
 *
 * 优雅设计：
 * - 自动验证节点 ID 唯一性
 * - 防止重复添加相同节点
 * - 返回新的节点数组（不可变）
 */
export function addNode(nodes: INode[], node: INode): INode[] {
    if (hasNode(nodes, node.id)) {
        throw new Error(`节点ID已存在: ${node.id}`);
    }
    return [...nodes, node];
}

/**
 * 批量添加节点
 *
 * 优雅设计：
 * - 事务性操作，要么全部成功要么全部失败
 * - 预先验证所有节点 ID，确保数据一致性
 */
export function addNodes(existingNodes: INode[], newNodes: INode[]): INode[] {
    const duplicateIds = newNodes.filter(node => hasNode(existingNodes, node.id)).map(node => node.id);
    if (duplicateIds.length > 0) {
        throw new Error(`以下节点ID已存在: ${duplicateIds.join(', ')}`);
    }
    return [...existingNodes, ...newNodes];
}

/**
 * 更新节点
 *
 * 优雅设计：
 * - 部分更新支持，无需提供完整节点对象
 * - 返回新的节点数组（不可变）
 */
export function updateNode(nodes: INode[], id: string, updates: Partial<Omit<INode, 'id' | 'type'>>): INode[] {
    const node = getNodeById(nodes, id);
    if (!node) {
        throw new Error(`节点不存在: ${id}`);
    }
    return nodes.map(n => n.id === id ? { ...n, ...updates } : n);
}

/**
 * 更新节点位置
 */
export function updateNodePosition(nodes: INode[], id: string, position: { x?: number; y?: number }): INode[] {
    const node = getNodeById(nodes, id);
    if (!node) {
        throw new Error(`节点不存在: ${id}`);
    }
    return nodes.map(n => {
        if (n.id !== id) return n;
        const newPosition = { ...n.position };
        if (position.x !== undefined) newPosition.x = position.x;
        if (position.y !== undefined) newPosition.y = position.y;
        return { ...n, position: newPosition };
    });
}

/**
 * 删除节点
 *
 * 优雅设计：
 * - 返回被删除的节点和新的节点数组
 * - 找不到节点时返回 undefined
 */
export function removeNode(nodes: INode[], id: string): { nodes: INode[]; removed?: INode } {
    const node = getNodeById(nodes, id);
    if (!node) {
        return { nodes, removed: undefined };
    }
    return {
        nodes: nodes.filter(n => n.id !== id),
        removed: node
    };
}

/**
 * 批量删除节点
 */
export function removeNodes(nodes: INode[], ids: string[]): { nodes: INode[]; removed: INode[] } {
    const removed: INode[] = [];
    const remaining = nodes.filter(node => {
        if (ids.includes(node.id)) {
            removed.push(node);
            return false;
        }
        return true;
    });
    return { nodes: remaining, removed };
}
