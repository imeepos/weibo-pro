import { IEdge, INode } from "../types";
import { hasNode } from "./nodes";

// ============================================
// WorkflowGraphAst 边管理工具函数
// ============================================

/**
 * 检查边是否存在
 *
 * 支持三种检查方式：
 * - 根据 ID 检查：hasEdge(edges, edgeId)
 * - 根据节点检查：hasEdge(edges, fromNodeId, toNodeId)
 * - 根据端口检查：hasEdge(edges, fromNodeId, toNodeId, fromProperty, toProperty)
 */
export function hasEdge(edges: IEdge[], fromOrId: string, to?: string, fromProperty?: string, toProperty?: string): boolean {
    if (to === undefined) {
        return edges.some(edge => edge.id === fromOrId);
    }

    return edges.some(edge => {
        if (edge.from !== fromOrId || edge.to !== to) return false;

        if (fromProperty !== undefined || toProperty !== undefined) {
            return edge.fromProperty === fromProperty && edge.toProperty === toProperty;
        }

        return true;
    });
}

/**
 * 根据 ID 获取边
 */
export function getEdgeById(edges: IEdge[], id: string): IEdge | undefined {
    return edges.find(edge => edge.id === id);
}

/**
 * 获取节点的所有相关边
 */
export function getEdgesByNode(edges: IEdge[], nodeId: string, direction: 'in' | 'out' | 'all' = 'all'): IEdge[] {
    return edges.filter(edge => {
        if (direction === 'in') return edge.to === nodeId;
        if (direction === 'out') return edge.from === nodeId;
        return edge.from === nodeId || edge.to === nodeId;
    });
}

/**
 * 添加边
 *
 * 优雅设计：
 * - 自动验证边的端点节点存在性
 * - 防止重复添加相同边
 */
export function addEdge(nodes: INode[], edges: IEdge[], edge: IEdge): IEdge[] {
    if (!hasNode(nodes, edge.from)) {
        throw new Error(`边的起始节点不存在: ${edge.from}`);
    }
    if (!hasNode(nodes, edge.to)) {
        throw new Error(`边的目标节点不存在: ${edge.to}`);
    }

    if (hasEdge(edges, edge.from, edge.to, edge.fromProperty, edge.toProperty)) {
        throw new Error(
            `边已存在: ${edge.from}.${edge.fromProperty || '*'} -> ${edge.to}.${edge.toProperty || '*'}`
        );
    }

    return [...edges, edge];
}

/**
 * 批量添加边
 */
export function addEdges(nodes: INode[], edges: IEdge[], newEdges: IEdge[]): IEdge[] {
    for (const edge of newEdges) {
        if (!hasNode(nodes, edge.from)) {
            throw new Error(`边的起始节点不存在: ${edge.from}`);
        }
        if (!hasNode(nodes, edge.to)) {
            throw new Error(`边的目标节点不存在: ${edge.to}`);
        }
    }

    return [...edges, ...newEdges];
}

/**
 * 添加条件边
 */
export function addConditionalEdge(nodes: INode[], edges: IEdge[], edge: IEdge): IEdge[] {
    if (!edge.condition) {
        throw new Error('条件边必须包含condition属性');
    }
    return addEdge(nodes, edges, edge);
}

/**
 * 更新边
 */
export function updateEdge(nodes: INode[], edges: IEdge[], id: string, updates: Partial<Omit<IEdge, 'id'>>): IEdge[] {
    const edge = getEdgeById(edges, id);
    if (!edge) {
        throw new Error(`边不存在: ${id}`);
    }

    if (updates.from && !hasNode(nodes, updates.from)) {
        throw new Error(`边的起始节点不存在: ${updates.from}`);
    }
    if (updates.to && !hasNode(nodes, updates.to)) {
        throw new Error(`边的目标节点不存在: ${updates.to}`);
    }

    return edges.map(e => e.id === id ? { ...e, ...updates } : e);
}

/**
 * 更新边的条件
 */
export function updateEdgeCondition(edges: IEdge[], id: string, condition: IEdge['condition']): IEdge[] {
    const edge = getEdgeById(edges, id);
    if (!edge) {
        throw new Error(`边不存在: ${id}`);
    }
    return edges.map(e => e.id === id ? { ...e, condition } : e);
}

/**
 * 删除边
 */
export function removeEdge(edges: IEdge[], id: string): { edges: IEdge[]; removed?: IEdge } {
    const edge = getEdgeById(edges, id);
    if (!edge) {
        return { edges, removed: undefined };
    }
    return {
        edges: edges.filter(e => e.id !== id),
        removed: edge
    };
}

/**
 * 删除节点的所有相关边
 */
export function removeEdgesByNode(edges: IEdge[], nodeId: string, direction: 'in' | 'out' | 'all' = 'all'): { edges: IEdge[]; removed: IEdge[] } {
    const removed: IEdge[] = [];
    const remaining = edges.filter(edge => {
        const shouldRemove =
            (direction === 'in' && edge.to === nodeId) ||
            (direction === 'out' && edge.from === nodeId) ||
            (direction === 'all' && (edge.from === nodeId || edge.to === nodeId));

        if (shouldRemove) {
            removed.push(edge);
            return false;
        }
        return true;
    });

    return { edges: remaining, removed };
}
