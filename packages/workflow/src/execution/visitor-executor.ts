import { Injectable, root, Inject, Optional } from '@sker/core';
import { Visitor, WorkflowGraphAst, setAstError } from '../ast';
import { findNodeType, HANDLER_METHOD } from '../decorator';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap, concatMap, tap } from 'rxjs/operators';
import { INode } from '../types';
import { DefaultVisitor } from '../defaultVisitor';
import { NodeEvent } from './events';
import type { IEventStore } from '../event-store';
import { EVENT_STORE, MemoryEventStore } from '../event-store';
import { globalRuntime } from '../runtime';

/**
 * 访问者执行器 - 工作流引擎的核心执行者
 *
 * 优雅设计：
 * - 通过装饰器系统自动查找并调用 Handler
 * - 支持 Promise 和 Observable 两种返回类型的 Handler
 * - 统一错误处理，设置节点状态
 * - Observable 流式输出，支持交互式执行
 * - 续跑支持：已成功节点直接重放 eventStream 中的事件
 * - EventStore 集成：持久化事件流，支持续跑和回放
 */
@Injectable()
export class VisitorExecutor implements Visitor {
    private eventStore: IEventStore
    constructor() {
        this.eventStore = root.get(EVENT_STORE, new MemoryEventStore())
    }

    visit(ast: INode, input$: Observable<any>, parent?: WorkflowGraphAst): Observable<NodeEvent> {
        // 续跑支持：检查 eventStream 中是否已成功执行
        if (parent) {
            const runId = globalRuntime.getRunId(parent);
            const eventStream = runId ? globalRuntime.getEventStream(runId) : undefined;

            if (eventStream?.isNodeSuccess(ast.id)) {
                const cachedEvents = eventStream.getNodeEvents(ast.id);
                console.log(`[VisitorExecutor] 节点 ${ast.id} 已成功，重放 ${cachedEvents.length} 个事件`);
                return from(cachedEvents);
            }
        }

        console.log(`[VisitorExecutor] 开始执行节点 ${ast.id} (${ast.type})`);

        const type = findNodeType(ast.type);
        console.log(`[VisitorExecutor] 解析节点类型: ${ast.type} -> ${type?.name || 'NOT FOUND'}`);

        const methods = root.get(HANDLER_METHOD, []);
        console.log(`[VisitorExecutor] 全局注册了 ${methods.length} 个 Handler`);

        if (!methods || methods.length === 0) {
            console.error(`[VisitorExecutor] 未找到任何 Handler`);
            return this.handleError(new Error(`未找到任何 Handler`), ast);
        }

        const method = methods.find(it => it.ast === type);

        if (!method) {
            console.log(`[VisitorExecutor] 未找到节点 ${ast.type} 的 Handler，使用 DefaultVisitor`);
            return this.recordEvents(
                this.useDefaultVisitor(ast, input$, parent),
                parent
            );
        }

        console.log(`[VisitorExecutor] 找到 Handler: ${method.target.name}.${String(method.property)}`);

        const instance = root.get(method.target);
        if (!method.property || typeof (instance as any)[method.property] !== 'function') {
            console.error(`[VisitorExecutor] Handler 方法不存在或不可调用: ${String(method.property)}`);
            return this.handleError(new Error(`Handler 方法不存在或不可调用: ${String(method.property)}`), ast);
        }

        try {
            const handlerFn = (instance as any)[method.property];
            const handlerLength = handlerFn.length;
            console.log(`[VisitorExecutor] Handler 参数数量: ${handlerLength}`);

            let execute$: Observable<NodeEvent>;

            if (handlerLength <= 2) {
                console.log(`[VisitorExecutor] 使用新模式 handler(ast, parent)`);
                // 新模式：input$ 的每次发射触发一次 handler 执行
                // node_success 只在 input$ complete 时发射
                execute$ = new Observable<NodeEvent>(obs => {
                    let started = false;
                    const sub = input$.subscribe({
                        next: inputData => {
                            console.log(`[VisitorExecutor] 应用输入数据到节点 ${ast.id}:`, inputData);
                            Object.keys(inputData).forEach(key => {
                                (ast as any)[key] = inputData[key];
                            });
                            if (!started) {
                                started = true;
                                ast.state = 'running';
                                obs.next({ type: 'node_runing', id: ast.id, data: ast });
                            }
                            try {
                                const result = handlerFn.call(instance, ast, parent);
                                // handler 只负责业务逻辑，只保留 node_emit
                                // node_runing/node_success/node_fail 由 VisitorExecutor 统一管理
                                this.normalizeResult(result, ast).subscribe({
                                    next: event => {
                                        if (event.type === 'node_emit') {
                                            obs.next(event);
                                        }
                                        // 忽略 node_runing/node_success/node_fail
                                    },
                                    error: err => {
                                        ast.state = 'fail';
                                        setAstError(ast, err);
                                        obs.next({ type: 'node_fail', id: ast.id, data: ast });
                                        obs.complete();
                                    }
                                });
                            } catch (err) {
                                ast.state = 'fail';
                                setAstError(ast, err);
                                obs.next({ type: 'node_fail', id: ast.id, data: ast });
                                obs.complete();
                            }
                        },
                        error: err => {
                            ast.state = 'fail';
                            setAstError(ast, err);
                            obs.next({ type: 'node_fail', id: ast.id, data: ast });
                            obs.complete();
                        },
                        complete: () => {
                            ast.state = 'success';
                            obs.next({ type: 'node_success', id: ast.id, data: ast });
                            obs.complete();
                        }
                    });
                    return () => sub.unsubscribe();
                });
            } else {
                console.log(`[VisitorExecutor] 使用旧模式 handler(ast, input$, parent)`);
                const result = handlerFn.call(instance, ast, input$, parent);
                execute$ = this.normalizeResult(result, ast);
            }

            // 如果 ast 是工作流，记录到自己；否则记录到 parent
            const recordTarget = this.isWorkflowGraphAst(ast) ? (ast as WorkflowGraphAst) : parent;
            return this.recordEvents(execute$, recordTarget);
        } catch (error) {
            console.error(`[VisitorExecutor] 执行节点 ${ast.id} 时发生错误:`, error);
            return this.handleError(error, ast);
        }
    }

    /**
     * 记录事件到 eventStream（续跑核心）
     *
     * 设计哲学：
     * - 透明拦截：Handler 无需感知记录逻辑
     * - 完整记录：保存所有事件到 eventStream
     * - EventStore 持久化：支持跨会话续跑
     */
    private recordEvents(
        source$: Observable<NodeEvent>,
        workflow?: WorkflowGraphAst
    ): Observable<NodeEvent> {
        if (!workflow) {
            return source$;
        }

        // 从 runtime 获取 runId 和 eventStream
        const runId = globalRuntime.getRunId(workflow);
        const eventStream = runId ? globalRuntime.getEventStream(runId) : undefined;

        if (!eventStream) {
            return source$;
        }

        return source$.pipe(
            tap(event => {
                // 记录到 eventStream
                eventStream.emit(event);

                // 持久化到 EventStore（异步，不阻塞执行）
                if (this.eventStore && runId) {
                    this.eventStore.append(runId, event).catch(err => {
                        console.error(`[VisitorExecutor.recordEvents] EventStore 追加事件失败:`, err);
                    });
                }
            })
        );
    }

    /**
     * 将 Handler 返回值统一为 Observable
     *
     * 优雅设计：
     * - 自动识别 Promise、Observable、同步值
     * - 直接传递所有事件，不做转换
     * - 错误转换为失败节点（Error as Data 模式）
     * - 支持嵌套类型：Promise<Observable<INode>>
     */
    private normalizeResult(result: any, ast: INode): Observable<NodeEvent> {
        // 1. Observable → 直接传递，只处理错误
        if (result && typeof result.subscribe === 'function') {
            return result.pipe(
                catchError(error => this.handleError(error, ast))
            );
        }

        // 2. Promise → 转 Observable，支持嵌套（Promise<Observable>）
        if (result && typeof result.then === 'function') {
            return from(result as Promise<any>).pipe(
                switchMap(res => {
                    // Promise resolve 的值可能是 Observable，需要递归处理
                    if (res && typeof res.subscribe === 'function') {
                        return this.normalizeResult(res, ast);
                    }
                    return of(res);
                }),
                catchError(error => this.handleError(error, ast))
            );
        }

        // 3. 同步值 → 包装为 Observable
        return of(result as NodeEvent).pipe(
            catchError(error => this.handleError(error, ast))
        );
    }

    private useDefaultVisitor(ast: INode, input$: Observable<any>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        const defaultVisitor = new DefaultVisitor();
        return defaultVisitor.visit(ast, input$, workflow).pipe(
            catchError(error => this.handleError(error, ast))
        );
    }

    /**
     * 创建失败状态的节点
     *
     * 优雅设计：
     * - 纯函数：不修改原节点，返回新节点
     * - Error as Data：错误作为节点的属性，而非异常
     */
    private createFailedNode(ast: INode, error: unknown): NodeEvent {
        const failedNode = { ...ast };
        failedNode.state = 'fail';
        setAstError(failedNode, error);
        return { type: 'node_fail', id: ast.id, data: ast };
    }

    /**
     * 统一错误处理
     *
     * 优雅设计：
     * - 设置节点状态为 fail
     * - 返回失败状态的节点（作为 Observable 完成）
     */
    private handleError(error: unknown, ast: INode): Observable<NodeEvent> {
        return of(this.createFailedNode(ast, error));
    }

    /**
     * 检查节点是否为工作流图
     */
    private isWorkflowGraphAst(ast: INode): boolean {
        return ast.type === 'WorkflowGraphAst' || 'nodes' in ast;
    }
}
