import { WorkflowGraphAst } from "./ast";
import { fromJson } from "./generate";
import { INode } from "./types";
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { root } from "@sker/core";
import { NetworkBuilder, WorkflowEvent } from "./execution/network-builder";
import { NodeExecutor } from "./execution/node-executor";

/**
 * 执行单个 AST 节点
 *
 * 优雅设计：
 * - 返回 Observable 支持流式输出
 * - 自动转换 JSON 为 AST 实例
 * - 委托给 Visitor 执行
 */
export function executeAst<S extends INode>(state: S, parent: WorkflowGraphAst): Observable<S> {
    const ast = fromJson(state);
    const visitor = root.get(NodeExecutor)
    return visitor.execute(ast, parent) as Observable<S>;
}

/**
 * 执行工作流（推荐方式）
 *
 * 使用 NetworkBuilder 纯流式架构
 * 通过 input$ 传入外部输入触发执行
 *
 * @example
 * ```typescript
 * const input$ = new Subject<any>()
 * const workflow$ = executeWorkflow(workflow, input$)
 *
 * workflow$.subscribe(event => console.log(event))
 * input$.next({ keyword: '热搜', count: 100 })
 * ```
 */
export function executeWorkflow(
    workflow: WorkflowGraphAst,
    input$: Subject<any>
): Observable<WorkflowEvent> {
    const builder = root.get(NetworkBuilder)
    return input$.pipe(builder.buildNetwork(workflow))
}

/**
 * 执行工作流（简化版）
 *
 * 自动创建 input$ 并立即触发
 * 适用于不需要外部输入的场景
 */
export function executeWorkflowImmediate(
    workflow: WorkflowGraphAst,
    inputData: Record<string, any> = {}
): Observable<WorkflowEvent> {
    const builder = root.get(NetworkBuilder)
    const input$ = new ReplaySubject<any>(1)

    input$.next(inputData)
    input$.complete()

    return input$.pipe(builder.buildNetwork(workflow))
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
export function executeAstWithWorkflowGraph(
    nodeId: string,
    context: WorkflowGraphAst,
    inputData: Record<string, any> = {}
): Observable<WorkflowEvent> {
    const builder = root.get(NetworkBuilder);
    const input$ = new ReplaySubject<any>(1);

    input$.next(inputData);
    input$.complete();

    return input$.pipe(builder.buildIncrementalNetwork(context, nodeId));
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
export function executeNodeIsolated(
    nodeId: string,
    context: WorkflowGraphAst,
    inputData: Record<string, any> = {}
): Observable<WorkflowEvent> {
    const builder = root.get(NetworkBuilder);
    const input$ = new ReplaySubject<any>(1);

    input$.next(inputData);
    input$.complete();

    return input$.pipe(builder.buildIsolatedNetwork(context, nodeId));
}