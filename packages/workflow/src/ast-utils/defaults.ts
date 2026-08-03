import { INode } from "../types";

// ============================================
// 节点默认值重置工具函数
// ============================================

/**
 * 重置节点的输入和输出为默认值
 *
 * 优雅设计：
 * - 防止上次执行的残留数据影响本次执行
 * - 直接使用 node.metadata.inputs 和 node.metadata.outputs 中的 defaultValue
 * - 如果节点已有该属性值，优先使用 metadata 中的 defaultValue（确保类型正确）
 * - 如果 metadata 中也没有 defaultValue，不设置（保持 undefined）
 * - 原地修改节点对象（性能优化）
 * - 如果节点标记为 stateful，则跳过重置（保留累积数据）
 *
 * @param node 要重置的节点
 */
export function resetNodeToDefaults(node: INode): void {
    try {
        // 检查节点是否标记为 stateful（状态保留）
        if (node.metadata?.class?.stateful) {
            console.log(`[resetNodeToDefaults] 节点 ${node.id} (${node.type}) 标记为 stateful，跳过重置`);
            return;
        }

        // 重置所有 @Input 属性
        const nodeInputs = node.metadata?.inputs || [];
        for (const inputMeta of nodeInputs) {
            const property = String(inputMeta.property);
            const defaultValue = inputMeta.defaultValue;

            // 优先使用 metadata 中的 defaultValue（确保类型正确）
            if (defaultValue !== undefined) {
                (node as any)[property] = cloneDefaultValue(defaultValue);
            }
        }

        // 重置所有 @Output 属性
        const nodeOutputs = node.metadata?.outputs || [];
        for (const outputMeta of nodeOutputs) {
            const property = String(outputMeta.property);
            const defaultValue = outputMeta.defaultValue;

            // 输出属性通常不需要保留节点的值，直接使用 defaultValue
            if (defaultValue !== undefined) {
                (node as any)[property] = cloneDefaultValue(defaultValue);
            }
        }
    } catch (error) {
        console.warn(`[resetNodeToDefaults] 重置节点 ${node.id} 默认值失败:`, error);
    }
}

/**
 * 克隆默认值（防止引用类型污染）
 *
 * 优雅设计：
 * - 基本类型直接返回
 * - 引用类型深拷贝
 * - 特殊处理 Date 对象
 */
function cloneDefaultValue(value: any): any {
    if (value === null || value === undefined) {
        return value;
    }

    // 基本类型
    if (typeof value !== 'object') {
        return value;
    }

    // Date 对象
    if (value instanceof Date) {
        return new Date(value);
    }

    // 数组
    if (Array.isArray(value)) {
        return value.map(item => cloneDefaultValue(item));
    }

    // 普通对象
    try {
        if (typeof structuredClone !== 'undefined') {
            return structuredClone(value);
        }
    } catch {
      // structuredClone 不可用时回退
    }

    // 回退到 JSON 深拷贝
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}
