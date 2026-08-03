import { ErrorSerializer, type SerializedError } from "@sker/core";
import { INode } from "../types";

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
    console.error(`❌ [${node.type}] 节点执行失败:`, {
        nodeId: node.id,
        nodeName: node.name,
        error: error instanceof Error ? error.message : String(error),
    });
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
