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
 * - 支持嵌套的 WorkflowGraphAst（子工作流/分组）
 * - 递归处理所有节点
 * - WorkflowGraphAst 转换为真正的类实例（确保 isGroup getter 正常工作）
 */
export function fromJson<T extends object = any>(json: any): T {
    if (!json) return json as T;

    const compiler = root.get(Compiler);

    // 如果是 WorkflowGraphAst，转换为真正的实例
    if (json.type === 'WorkflowGraphAst') {
        const ast = new WorkflowGraphAst();
        Object.assign(ast, json);

        // 递归处理子节点
        if (Array.isArray(json.nodes)) {
            ast.nodes = json.nodes.map((node: any) => {
                if (node.type === 'WorkflowGraphAst') {
                    return fromJson(node);
                }
                return compiler.compile(node);
            });
        }

        return ast as T;
    }
    // 如果是单个节点
    else if (json.type) {
        return compiler.compile(json) as T;
    }

    return json as T;
}

export function toJson(ast: Ast): INode {
    return ast as INode;
}
