import { root } from "@sker/core";
import { INPUT, OUTPUT, findNodeType } from "../decorator";
import { IEdge, INode } from "../types";

// ============================================
// 开始节点和结束节点工具函数
// ============================================

/**
 * 获取开始节点的输入字段定义（用于生成运行时表单）
 *
 * 优雅设计：
 * - 如果 entryNodeIds 为空，回退到自动识别（无入边节点）
 * - 收集所有开始节点的 @Input 元数据
 * - 返回格式化的表单字段定义
 * - 支持 nodeId.property 格式，便于后续数据注入
 */
export function getEntryNodeInputs(
    nodes: INode[],
    edges: IEdge[],
    entryNodeIds?: string[]
): Array<{
    nodeId: string;
    property: string;
    title?: string;
    type?: string;
    required?: boolean;
    defaultValue?: any;
}> {
    const inputs: Array<{
        nodeId: string;
        property: string;
        title?: string;
        type?: string;
        required?: boolean;
        defaultValue?: any;
    }> = [];

    // 确定开始节点：优先使用显式指定，否则自动识别（无入边节点）
    const entryNodes = entryNodeIds && entryNodeIds.length > 0
        ? nodes.filter(node => entryNodeIds.includes(node.id))
        : nodes.filter(node => {
            const hasIncomingEdges = edges.some(edge => edge.to === node.id);
            return !hasIncomingEdges;
        });

    for (const node of entryNodes) {
        // 跳过子工作流节点
        if (node.type === 'WorkflowGraphAst') continue;

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) continue;

            const inputMetadatas = root.get(INPUT, []);
            const nodeInputs = inputMetadatas.filter((meta: any) => meta.target === ctor);

            for (const inputMeta of nodeInputs) {
                const property = String(inputMeta.propertyKey);

                inputs.push({
                    nodeId: node.id,
                    property,
                    title: inputMeta.title || property,
                    type: inputMeta.type,
                    required: inputMeta.required,
                    defaultValue: inputMeta.defaultValue ?? (node as any)[property]
                });
            }
        } catch (error) {
            console.warn(`[getEntryNodeInputs] 获取节点 ${node.id} 输入元数据失败:`, error);
            continue;
        }
    }

    return inputs;
}

/**
 * 提取结束节点的输出值
 *
 * 优雅设计：
 * - 如果 endNodeIds 为空，返回空对象（不收集输出）
 * - 只提取成功完成的结束节点
 * - 按照 ${nodeId}.${property} 格式返回（与子工作流输出一致）
 * - 支持外部直接使用这些输出值
 */
export function extractEndNodeOutputs(nodes: INode[], endNodeIds: string[]): Record<string, any> {
    const outputs: Record<string, any> = {};

    // 如果未指定结束节点，返回空
    if (!endNodeIds || endNodeIds.length === 0) {
        return outputs;
    }

    // 过滤出结束节点
    const endNodes = nodes.filter(node => endNodeIds.includes(node.id));

    for (const node of endNodes) {
        // 跳过子工作流节点
        if (node.type === 'WorkflowGraphAst') continue;

        // 只处理成功完成的节点
        if (node.state !== 'success') {
            console.warn(`[extractEndNodeOutputs] 结束节点 ${node.id} 状态为 ${node.state}，跳过输出提取`);
            continue;
        }

        try {
            const ctor = findNodeType(node.type);
            if (!ctor) continue;

            const outputMetadatas = root.get(OUTPUT, []);
            const nodeOutputs = outputMetadatas.filter((meta: any) => meta.target === ctor);

            for (const outputMeta of nodeOutputs) {
                const property = String(outputMeta.propertyKey);
                const value = (node as any)[property];

                if (value !== undefined) {
                    const outputKey = `${node.id}.${property}`;
                    outputs[outputKey] = value;
                }
            }
        } catch (error) {
            console.warn(`[extractEndNodeOutputs] 提取节点 ${node.id} 输出时出错:`, error);
            continue;
        }
    }

    return outputs;
}
