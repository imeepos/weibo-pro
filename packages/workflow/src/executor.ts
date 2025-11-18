import { WorkflowGraphAst } from "./ast";
import { Handler } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
import { WorkflowScheduler } from './execution/scheduler';
import { VisitorExecutor } from './execution/visitor-executor';
import { Observable } from 'rxjs';
import { Injectable, root } from "@sker/core";

@Injectable()
export class WorkflowExecutorVisitor {
    /**
     * 执行工作流图
     */
    @Handler(WorkflowGraphAst)
    visit(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
        const scheduler = root.get(WorkflowScheduler)
        return scheduler.schedule(ast, ctx);
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
