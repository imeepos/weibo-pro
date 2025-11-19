import { WorkflowGraphAst } from "./ast";
import { Handler } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
import { LegacyScheduler } from './execution/scheduler';
import { ReactiveScheduler } from './execution/reactive-scheduler';
import { VisitorExecutor } from './execution/visitor-executor';
import { Observable } from 'rxjs';
import { Injectable, root } from "@sker/core";

@Injectable()
export class WorkflowExecutorVisitor {
    /**
     * 执行工作流图
     *
     * 特性标志：
     * - ctx.useReactiveScheduler: true  → 使用新的响应式调度器（推荐）
     * - ctx.useReactiveScheduler: false → 使用传统调度器（默认，向后兼容）
     */
    @Handler(WorkflowGraphAst)
    visit(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
        // 检查是否启用响应式调度器
        const useReactive = ctx?.useReactiveScheduler ?? false;

        if (useReactive) {
            // 使用新的响应式调度器
            const scheduler = root.get(ReactiveScheduler);
            return scheduler.schedule(ast, ctx);
        } else {
            // 使用传统调度器（默认，向后兼容）
            const scheduler = root.get(LegacyScheduler);
            return scheduler.schedule(ast, ctx);
        }
    }
}

/**
 * 执行单个 AST 节点
 *
 * 优雅设计：
 * - 返回 Observable 支持流式输出
 * - 自动转换 JSON 为 AST 实例
 * - 委托给 Visitor 执行
 */
export function executeAst<S extends INode>(state: S, context: any): Observable<S> {
    const ast = fromJson(state);
    const visitor = root.get(VisitorExecutor)
    // 单步执行 每次返回单步执行后的 结果
    return visitor.visit(ast, context) as Observable<S>;
}
