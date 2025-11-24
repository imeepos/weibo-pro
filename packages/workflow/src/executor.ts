import { WorkflowGraphAst } from "./ast";
import { Handler } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
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
    visit(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<INode> {
        const scheduler = root.get(ReactiveScheduler);
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
export function executeAst<S extends INode>(state: S, context: WorkflowGraphAst): Observable<S> {
    const ast = fromJson(state);
    const visitor = root.get(VisitorExecutor)
    // 单步执行 每次返回单步执行后的 结果
    return visitor.visit(ast, context) as Observable<S>;
}

/**
 * 执行工作流中的节点及其所有下游（增量执行）
 *
 * 适用场景：
 * - 修改节点配置后，需要更新该节点及下游的执行结果
 * - 类似 Make 工具的增量编译
 *
 * @param nodeId 目标节点ID
 * @param context 工作流上下文
 */
export function executeAstWithWorkflowGraph(nodeId: string, context: WorkflowGraphAst) {
    const scheduler = root.get(ReactiveScheduler);
    console.log(`executeAstWithWorkflowGraph`, { nodeId, context })
    return scheduler.fineTuneNode(context, nodeId);
}

/**
 * 执行单个节点（不影响下游）
 *
 * 适用场景：
 * - 测试单个节点逻辑
 * - 调试节点配置
 * - 不希望触发下游节点重新执行
 *
 * 前置条件：
 * - 所有上游节点必须已执行完成（使用历史输出作为输入）
 *
 * @param nodeId 目标节点ID
 * @param context 工作流上下文
 */
export function executeNodeIsolated(nodeId: string, context: WorkflowGraphAst) {
    const scheduler = root.get(ReactiveScheduler);
    console.log(`executeNodeIsolated`, { nodeId, context })
    return scheduler.executeNodeIsolated(context, nodeId);
}