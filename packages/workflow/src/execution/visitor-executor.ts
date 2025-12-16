import { Injectable, root, Inject, Optional } from '@sker/core';
import { Visitor, WorkflowGraphAst, setAstError } from '../ast';
import { findNodeType, HANDLER_METHOD } from '../decorator';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap, concatMap, tap, finalize } from 'rxjs/operators';
import { INode } from '../types';
import { DefaultVisitor } from '../defaultVisitor';
import { NodeEvent } from './events';
import type { IEventStore } from '../event-store';
import { EVENT_STORE } from '../event-store';

/**
 * 访问者执行器 - 工作流引擎的核心执行者
 *
 * 优雅设计：
 * - 通过装饰器系统自动查找并调用 Handler
 * - 支持 Promise 和 Observable 两种返回类型的 Handler
 * - 统一错误处理，设置节点状态
 * - Observable 流式输出，支持交互式执行
 * - 节点幂等执行：缓存拦截 + 结果重放（断点续跑核心）
 * - EventStore 集成：持久化事件流，支持续跑和回放
 */
@Injectable()
export class VisitorExecutor implements Visitor {
    constructor(
        @Optional(EVENT_STORE) @Inject(EVENT_STORE) private eventStore?: IEventStore
    ) {}
    visit(ast: INode, input$: Observable<any>, parent?: WorkflowGraphAst): Observable<NodeEvent> {
        // 幂等执行：检查缓存
        if (parent?.nodeResults?.has(ast.id)) {
            const cached = parent.nodeResults.get(ast.id)!;
            console.log(`[VisitorExecutor] 节点 ${ast.id} 命中缓存，重放 ${cached.length} 个事件`);
            return from(cached);
        }

        const type = findNodeType(ast.type);
        const methods = root.get(HANDLER_METHOD, []);

        if (!methods || methods.length === 0) {
            return this.handleError(new Error(`未找到任何 Handler`), ast);
        }

        const method = methods.find(it => it.ast === type);
        if (!method) {
            return this.cacheEvents(
                this.useDefaultVisitor(ast, input$, parent),
                ast.id,
                parent
            );
        }

        const instance = root.get(method.target);
        if (!method.property || typeof (instance as any)[method.property] !== 'function') {
            return this.handleError(new Error(`Handler 方法不存在或不可调用: ${String(method.property)}`), ast);
        }

        try {
            const handlerFn = (instance as any)[method.property];
            const handlerLength = handlerFn.length;

            let execute$: Observable<NodeEvent>;

            if (handlerLength <= 2) {
                execute$ = input$.pipe(
                    concatMap(inputData => {
                        Object.keys(inputData).forEach(key => {
                            (ast as any)[key] = inputData[key];
                        });
                        const result = handlerFn.call(instance, ast, parent);
                        return this.normalizeResult(result, ast);
                    }),
                    catchError(error => this.handleError(error, ast))
                );
            } else {
                const result = handlerFn.call(instance, ast, input$, parent);
                execute$ = this.normalizeResult(result, ast);
            }

            return this.cacheEvents(execute$, ast.id, parent);
        } catch (error) {
            return this.handleError(error, ast);
        }
    }

    /**
     * 缓存节点事件流（断点续跑 + 时间旅行核心）
     *
     * 设计哲学：
     * - 透明拦截：Handler 无需感知缓存逻辑
     * - 完整记录：保存所有事件，支持精确重放
     * - 只缓存成功节点：失败节点不写入缓存，支持重试
     * - EventStore 持久化：支持跨会话续跑
     */
    private cacheEvents(
        source$: Observable<NodeEvent>,
        nodeId: string,
        parent?: WorkflowGraphAst
    ): Observable<NodeEvent> {
        if (!parent) return source$;

        const events: NodeEvent[] = [];
        let hasSuccess = false;

        return source$.pipe(
            tap(event => {
                events.push(event);

                // 持久化到 EventStore（异步，不阻塞执行）
                if (this.eventStore && parent.runId) {
                    this.eventStore.append(parent.runId, event).catch(err => {
                        console.error(`[EventStore] 追加事件失败:`, err);
                    });
                }

                if (event.type === 'node_success') hasSuccess = true;
            }),
            finalize(() => {
                // 只缓存成功节点（失败节点支持重试）
                if (events.length > 0 && hasSuccess) {
                    parent.nodeResults.set(nodeId, events);
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
     * 统一错误处理（保留用于兼容性）
     *
     * 优雅设计：
     * - NoRetryError 不可重试错误特殊处理
     * - 设置节点状态为 fail
     * - 返回失败状态的节点（作为 Observable 完成）
     */
    private handleError(error: unknown, ast: INode): Observable<NodeEvent> {
        return of(this.createFailedNode(ast, error));
    }
}
