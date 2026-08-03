import { root } from "@sker/core";
import { INPUT, NODE, OUTPUT, findNodeType } from "../decorator";
import { IEdge, INode } from "../types";
import { hasNode } from "./nodes";

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
        } catch (_error) {
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
        } catch (_error) {
            continue;
        }
    }

    return exposedOutputs;
}
