import { Ast, WorkflowGraphAst } from "./ast";
import { INode } from "./types";
import { Compiler } from "./compiler";
import { root } from "@sker/core";
import { WorkflowEventStream } from "./event-store/event-stream";

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
 * - eventStream 重建：支持从已有事件恢复续跑状态
 * - @Output BehaviorSubject 属性由类默认值初始化
 */
export function fromJson<T extends object = any>(json: any): T {
    if (!json) return json as T;

    const compiler = root.get(Compiler);

    // 如果是 WorkflowGraphAst，转换为真正的实例
    if (json.type === 'WorkflowGraphAst') {
        const ast = new WorkflowGraphAst();

        // 排除 eventStream 和 eventStreamData 字段，避免被普通对象覆盖
        const { eventStream, eventStreamData, ...jsonWithoutEventStream } = json;
        Object.assign(ast, jsonWithoutEventStream);

        // 确保 eventStream 始终是 WorkflowEventStream 实例
        if (eventStreamData && typeof eventStreamData === 'object' && 'events' in eventStreamData) {
            // 从持久化数据恢复（优先）
            ast.eventStream = WorkflowEventStream.fromJSON(eventStreamData);
        } else if (eventStream && typeof eventStream === 'object' && ('events' in eventStream || Array.isArray((eventStream as any)._events$?.value))) {
            // 如果 JSON 中有 eventStream 但不是类实例，尝试恢复
            // 支持两种格式：{ events: [...] } 或包含 BehaviorSubject 的对象
            const eventsData = 'events' in eventStream
                ? eventStream.events
                : (eventStream as any)._events$?.value || [];
            ast.eventStream = WorkflowEventStream.fromJSON({ events: eventsData });
        } else {
            // 创建全新实例
            ast.eventStream = new WorkflowEventStream();
        }

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
 */
import { clone } from './utils'
export function toJson(ast: Ast): INode {
    return clone(ast) as INode;
}
