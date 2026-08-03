import { Injectable, Inject } from '@sker/core';
import { Observable, EMPTY, of, isObservable } from 'rxjs';
import { concatMap, catchError, shareReplay } from 'rxjs/operators';
import { NodeExecutor } from './executor';
import { Handler } from './decorator';
import { WorkflowGraphAst } from './ast';
import { NodeEvent } from './execution/events';
import { WorkflowInputBuilder } from './execution/WorkflowInputBuilder';
import { WorkflowEventMerger } from './execution/WorkflowEventMerger';
import { ExecutionContext } from './execution/ExecutionContext';

/**
 * 工作流节点执行器
 *
 * 优雅设计：
 * - 统一工作流与普通节点的执行模式
 * - WorkflowGraphAst 作为一个节点，通过 @Handler 装饰器注册
 * - 管理工作流级别的状态转换（pending → running → success/fail）
 * - 协调子节点执行，构建数据流网络
 * - 监听子节点完成状态，决定工作流最终状态
 *
 * 架构哲学：
 * - 节点平等：WorkflowGraphAst 与其他节点享有相同的 Visitor 模式
 * - 递归优雅：子工作流也通过同样的机制执行
 * - 职责分离：NodeExecutor 仅负责调度，Visitor 负责具体逻辑
 * - 循环依赖解决：通过构造函数注入 NodeExecutor（DI 容器延迟解析）
 *
 * 重构后职责：
 * - 协调各个辅助类完成工作流执行
 * - 输入流构建委托给 WorkflowInputBuilder
 * - 保持 handler 方法简洁清晰
 */
@Injectable()
export class WorkflowGraphAstVisitor {
    constructor(
        @Inject(NodeExecutor) private nodeExecutor: NodeExecutor,
        @Inject(WorkflowInputBuilder) private inputBuilder: WorkflowInputBuilder,
        @Inject(WorkflowEventMerger) private workflowEventMerger: WorkflowEventMerger,
    ) { }

    @Handler(WorkflowGraphAst)
    handler(ast: WorkflowGraphAst, input$: Observable<any>, _parent?: WorkflowGraphAst): Observable<NodeEvent> {
        if (!input$) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ is empty`)
        if (!isObservable(input$)) throw new Error(`[WorkflowGraphAstVisitor.handler] input$ must be an Observable`)

        return input$.pipe(
            concatMap(input => {
                // 创建执行上下文，隔离每次执行的状态
                const ctx = new ExecutionContext();
                const workflowState = ctx.getNodeState(ast.id);
                workflowState.state = 'running';
                workflowState.error = undefined;

                // 同步状态到 AST（用于 UI 显示）
                ast.state = 'running';
                ast.error = undefined;

                const nodeEventStreams = new Map<string, Observable<NodeEvent>>();

                // 1. 构建每个节点的输入流（合并系统输入和边输入）
                const nodeInputStreams = this.inputBuilder.buildNodeInputStreams(ast, of(input), nodeEventStreams);

                // 2. 为每个节点创建执行流
                ast.nodes.forEach((node, _index) => {
                    const nodeInput$ = nodeInputStreams.get(node.id) || EMPTY;

                    const eventStream$ = this.nodeExecutor.run(node, nodeInput$, ast).pipe(
                        // refCount: true 使最后订阅者退订时拆除源订阅，避免 run 被中断/取消后整条节点执行链泄漏。
                        // bufferSize 保持 Infinity：节点事件数本身有界，replay 语义不变。
                        shareReplay({ bufferSize: Infinity, refCount: true })
                    );
                    nodeEventStreams.set(node.id, eventStream$);
                });

                // 3. 合并所有事件流（传入执行上下文）
                return this.workflowEventMerger.mergeNodeEventStreams(ast, nodeEventStreams, ctx);
            }),
            catchError(error => {
                ast.state = 'fail';
                ast.error = error;
                // 发射 node_fail 事件和包含 null 的 node_emit 事件，让下游节点继续处理
                return of(
                    { type: 'node_fail' as const, id: ast.id, error: (error as Error).message },
                    { type: 'node_emit' as const, id: ast.id, data: {} }
                );
            })
        );
    }
}
