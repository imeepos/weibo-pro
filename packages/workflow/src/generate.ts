import { Ast, WorkflowGraphAst } from "./ast";
import { INode } from "./types";
import { Compiler } from "./compiler";
import { root } from "@sker/core";
import { BehaviorSubject } from "rxjs";
import { findNodeType, OUTPUT } from "./decorator";

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
 * - @Output BehaviorSubject 属性由类默认值初始化
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

/**
 * 序列化 AST 为 JSON
 *
 * 设计：
 * - 跳过 BehaviorSubject 类型的 @Output 属性（运行时状态）
 * - 只保存元数据，不保存运行时值
 */
export function toJson(ast: Ast): INode {
    if (!ast || !ast.type) return ast as INode;

    // 获取需要跳过的属性（BehaviorSubject 类型的 @Output）
    const skipProperties = getOutputSubjectProperties(ast);

    if (skipProperties.size === 0) {
        return ast as INode;
    }

    // 创建新对象，跳过 BehaviorSubject 属性
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(ast)) {
        if (!skipProperties.has(key)) {
            // 递归处理嵌套的节点
            if (key === 'nodes' && Array.isArray(value)) {
                result[key] = value.map(node => toJson(node));
            } else {
                result[key] = value;
            }
        }
    }

    return result as INode;
}

/**
 * 获取节点中是 BehaviorSubject 类型的 @Output 属性名
 */
function getOutputSubjectProperties(ast: any): Set<string> {
    const properties = new Set<string>();

    if (!ast.type) return properties;

    const ctor = findNodeType(ast.type);
    if (!ctor) return properties;

    const outputs = root.get(OUTPUT, []).filter(it => it.target === ctor);

    for (const output of outputs) {
        const key = String(output.propertyKey);
        const value = ast[key];
        if (value instanceof BehaviorSubject) {
            properties.add(key);
        }
    }

    return properties;
}
