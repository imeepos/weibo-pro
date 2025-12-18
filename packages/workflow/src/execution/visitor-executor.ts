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
        // 续跑支持：如果节点已成功执行，直接重放事件
        if (parent && globalRuntime.events.isNodeSuccess(ast.id)) {
            const cachedEvents = globalRuntime.events.getNodeEvents(ast.id);
            return from(cachedEvents);
        }

        const type = findNodeType(ast.type);
        const methods = root.get(HANDLER_METHOD, []);

        if (!methods || methods.length === 0) {
            console.error(`[VisitorExecutor] 未找到任何 Handler`);
            return this.handleError(new Error(`未找到任何 Handler`), ast);
        }

        const method = methods.find(it => it.ast === type);

        if (!method) {
            return this.recordEvents(
                this.useDefaultVisitor(ast, input$, parent),
                parent
            );
        }

        const instance = root.get(method.target);
        if (!method.property || typeof (instance as any)[method.property] !== 'function') {
            console.error(`[VisitorExecutor] Handler 方法不存在或不可调用: ${String(method.property)}`);
            return this.handleError(new Error(`Handler 方法不存在或不可调用: ${String(method.property)}`), ast);
        }

        try {
            const handlerFn = (instance as any)[method.property];
            const handlerLength = handlerFn.length;

            let execute$: Observable<NodeEvent>;

            if (handlerLength <= 2) {
                execute$ = new Observable<NodeEvent>(obs => {
                    let started = false;
                    const sub = input$.subscribe({
                        next: inputData => {
                            Object.keys(inputData).forEach(key => {
                                (ast as any)[key] = inputData[key];
                            });
                            if (!started) {
                                started = true;
                                ast.state = 'running';
                                obs.next({ type: 'node_runing', id: ast.id });
                            }
                            try {
                                const result = handlerFn.call(instance, ast, parent);
                                this.normalizeResult(result, ast).subscribe({
                                    next: event => {
                                        if (event.type === 'node_emit') {
                                            obs.next(event);
                                        }
                                    },
                                    error: err => {
                                        ast.state = 'fail';
                                        setAstError(ast, err);
                                        obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                                        obs.complete();
                                    }
                                });
                            } catch (err) {
                                ast.state = 'fail';
                                setAstError(ast, err);
                                obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                                obs.complete();
                            }
                        },
                        error: err => {
                            ast.state = 'fail';
                            setAstError(ast, err);
                            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
                            obs.complete();
                        },
                        complete: () => {
                            ast.state = 'success';
                            obs.next({ type: 'node_success', id: ast.id });
                            obs.complete();
                        }
                    });
                    return () => sub.unsubscribe();
                });
            } else {
                const result = handlerFn.call(instance, ast, input$, parent);
                execute$ = this.normalizeResult(result, ast);
            }

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
     * - 完整记录：保存所有事件到全局 eventStream
     */
    private recordEvents(
        source$: Observable<NodeEvent>,
        workflow?: WorkflowGraphAst
    ): Observable<NodeEvent> {
        if (!workflow) {
            return source$;
        }

        return source$.pipe(
            tap(event => {
                // 记录到全局 eventStream（内部有 storeEnabled 开关检查）
                globalRuntime.events.emit(event);
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
        return { type: 'node_fail', id: ast.id, error: ast.error?.message };
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
