import { Ast, WorkflowGraphAst } from "./ast";
import { INode } from "./types";
import { Compiler } from "./compiler";
import { root } from "@sker/core";

export type NodeJsonPayload = Omit<Partial<INode>, 'type'> & Record<string, unknown> & {
    type: string;
};

/**
 * 从 JSON 反序列化为 AST
 *
 * 优雅设计：
 * - 自动编译所有节点，确保包含 metadata
 * - 支持嵌套的 WorkflowGraphAst（子工作流）
 * - 递归处理所有节点
 */
export function fromJson<T extends object = any>(json: any): T {
    if (!json) return json as T;

    const compiler = root.get(Compiler);

    // 如果是 WorkflowGraphAst，编译所有子节点
    if (json.type === 'WorkflowGraphAst' && Array.isArray(json.nodes)) {
        json.nodes = json.nodes.map((node: any) => {
            // 递归处理嵌套的 WorkflowGraphAst
            if (node.type === 'WorkflowGraphAst') {
                return fromJson(node);
            }
            // 编译节点以恢复 metadata
            return compiler.compile(node);
        });
    }
    // 如果是单个节点
    else if (json.type && !json.nodes) {
        return compiler.compile(json) as T;
    }

    return json as T;
}

export function toJson(ast: Ast): INode {
    return ast as INode;
}
