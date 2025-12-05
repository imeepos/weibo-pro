import { ErrorSerializer, SerializedError, root } from "@sker/core";
import { IEdge, INode } from "./types";
import { INPUT, OUTPUT, NODE, findNodeType } from "./decorator";
import { Ast } from "./ast";

// ============================================
// Ast 错误处理工具函数
// ============================================

/**
 * 为节点设置错误信息
 *
 * 优雅设计：
 * - 自动序列化任何类型的错误对象
 * - 保留完整的错误上下文
 * - 统一的错误处理接口
 */
export function setAstError(node: INode, error: unknown, includeStack = false): void {
    node.error = ErrorSerializer.serialize(error, includeStack);
}

/**
 * 提取节点最深层的错误信息
 */
export function getAstDeepError(node: INode): SerializedError | undefined {
    return node.error ? ErrorSerializer.extractDeepestError(node.error) : undefined;
}

/**
 * 获取节点完整的错误描述
 */
export function getAstErrorDescription(node: INode): string | undefined {
    return node.error ? ErrorSerializer.getFullDescription(node.error) : undefined;
}

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
 * 检查节点是否存在
 */
export function hasNode(nodes: INode[], id: string): boolean {
    return nodes.some(node => node.id === id);
}

/**
 * 根据 ID 获取节点
 */
export function getNodeById<T extends INode = INode>(nodes: INode[], id: string): T | undefined {
    return nodes.find(node => node.id === id) as T | undefined;
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

// ============================================
// WorkflowGraphAst 图操作工具函数
// ============================================

/**
 * 验证图的连通性
 */
export function validateGraph(nodes: INode[], edges: IEdge[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const edge of edges) {
        if (!hasNode(nodes, edge.from)) {
            errors.push(`边的起始节点不存在: ${edge.from} (边ID: ${edge.id})`);
        }
        if (!hasNode(nodes, edge.to)) {
            errors.push(`边的目标节点不存在: ${edge.to} (边ID: ${edge.id})`);
        }
    }

    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
    }

    const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (isolatedNodes.length > 0) {
        errors.push(`发现孤立节点: ${isolatedNodes.map(n => n.id).join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 清空所有节点和边
 */
export function clearGraph(
    nodes: INode[],
    edges: IEdge[],
    options: { nodes?: boolean; edges?: boolean } = { nodes: true, edges: true }
): { nodes: INode[]; edges: IEdge[]; previous: { nodes: INode[]; edges: IEdge[] } } {
    return {
        nodes: options.nodes ? [] : nodes,
        edges: options.edges ? [] : edges,
        previous: {
            nodes: options.nodes ? [...nodes] : [],
            edges: options.edges ? [...edges] : []
        }
    };
}

/**
 * 清理工作流中孤立的动态属性
 *
 * 应用场景：
 * - 删除节点后，清理引用该节点的 `nodeId.property` 格式属性
 * - 执行工作流前，确保所有动态属性都有效
 *
 * 优雅设计：
 * - 原地修改 workflow 对象（性能优化）
 * - 自动识别动态属性格式
 * - 仅清理引用不存在节点的属性
 *
 * @param workflow 工作流 AST 对象
 * @param deletedNodeIds 可选，仅清理引用这些节点的属性（性能优化）
 */
export function cleanOrphanedProperties(
    workflow: INode,
    deletedNodeIds?: string[]
): void {
    const validNodeIds = deletedNodeIds
        ? new Set(
              (workflow as any).nodes
                  ?.map((n: INode) => n.id)
                  .filter((id: string) => !deletedNodeIds.includes(id))
          )
        : new Set((workflow as any).nodes?.map((n: INode) => n.id) || []);

    // 内置属性白名单
    const builtinProps = new Set([
        'id',
        'type',
        'name',
        'description',
        'state',
        'error',
        'count',
        'emitCount',
        'position',
        'color',
        'collapsed',
        'width',
        'dynamicOutputs',
        'nodes',
        'edges',
        'entryNodeIds',
        'viewport',
        'tags',
        'abortSignal'
    ]);

    Object.keys(workflow).forEach((key) => {
        // 跳过内置属性
        if (builtinProps.has(key)) {
            return;
        }

        // 检查是否是动态属性（包含点号）
        const lastDotIndex = key.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return;
        }

        const nodeId = key.substring(0, lastDotIndex);

        // 如果指定了 deletedNodeIds，仅清理这些节点的属性
        if (deletedNodeIds && !deletedNodeIds.includes(nodeId)) {
            return;
        }

        // 如果节点不存在，删除该属性
        if (!validNodeIds.has(nodeId)) {
            delete (workflow as any)[key];
        }
    });
}

/**
 * 动态计算工作流的输入端口
 *
 * 优雅设计：
 * - 输入端口 = 内部节点的未连接输入
 * - 这些输入需要从外部提供数据
 * - 自动根据内部结构推断接口
 */
export function getExposedInputs(nodes: INode[], edges: IEdge[]): Array<{
    nodeId: string;
    property: string;
    title?: string;
    type?: string;
    required?: boolean;
}> {
    const exposedInputs: Array<{
        nodeId: string;
        property: string;
        title?: string;
        type?: string;
        required?: boolean;
    }> = [];

    for (const node of nodes) {
        const isConnected = edges.some(edge => edge.to === node.id);
        if (isConnected) continue;
        if (node.type === 'WorkflowGraphAst') continue;

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) continue;

            const inputMetadatas = root.get(INPUT, []);
            const nodeInputs = inputMetadatas.filter((meta: any) => meta.target === ctor);

            for (const inputMeta of nodeInputs) {
                const property = String(inputMeta.propertyKey);

                if (!isConnected) {
                    exposedInputs.push({
                        nodeId: node.id,
                        property,
                        title: inputMeta.title || property,
                        type: inputMeta.type,
                        required: inputMeta.required
                    });
                }
            }
        } catch (error) {
            continue;
        }
    }

    return exposedInputs;
}

/**
 * 动态计算工作流的输出端口
 *
 * 优雅设计：
 * - 输出端口 = 内部节点的未连接输出
 * - 这些输出可以被外部消费
 * - 自动根据内部结构推断接口
 */
export function getExposedOutputs(nodes: INode[], edges: IEdge[]): Array<{
    nodeId: string;
    property: string;
    title?: string;
    type?: string;
}> {
    const exposedOutputs: Array<{
        nodeId: string;
        property: string;
        title?: string;
        type?: string;
    }> = [];

    for (const node of nodes) {
        if (node.type === 'WorkflowGraphAst') continue;

        try {
            const registry = root.get(NODE, []);
            const nodeMetadata = registry.find((meta: any) => meta.target.name === node.type);
            const ctor = nodeMetadata?.target;
            if (!ctor) continue;

            const outputMetadatas = root.get(OUTPUT, []);
            const nodeOutputs = outputMetadatas.filter((meta: any) => meta.target === ctor);

            for (const outputMeta of nodeOutputs) {
                const property = String(outputMeta.propertyKey);
                const isConnected = edges.some(edge => edge.from === node.id && edge.fromProperty === property);

                if (!isConnected) {
                    exposedOutputs.push({
                        nodeId: node.id,
                        property,
                        title: outputMeta.title || property,
                        type: outputMeta.type
                    });
                }
            }
        } catch (error) {
            continue;
        }
    }

    return exposedOutputs;
}
