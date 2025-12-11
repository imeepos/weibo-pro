// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { root, Injectable } from '@sker/core';
import { VisitorExecutor } from './visitor-executor';
import { Node, Handler, Input, Output } from '../decorator';
import { Ast, createWorkflowGraphAst } from '../ast';
import { Compiler } from '../compiler';
import { Observable, of, firstValueFrom, lastValueFrom, toArray, map } from 'rxjs';
import { INode } from '../types';
import { NoRetryError } from '../errors';

describe('VisitorExecutor', () => {
    let executor: VisitorExecutor;
    let compiler: Compiler;

    beforeEach(() => {
        executor = root.get(VisitorExecutor);
        compiler = root.get(Compiler);
    });

    describe('visit()', () => {
        it('执行同步 Handler', async () => {
            @Node({ title: '同步节点' })
            class SyncAst extends Ast {
                @Output() result?: string;
                type = 'SyncAst';
            }

            @Injectable()
            class SyncVisitor {
                @Handler(SyncAst)
                visit(ast: SyncAst): INode {
                    ast.state = 'success';
                    ast.result = 'sync-result';
                    return ast as INode;
                }
            }

            const ast = new SyncAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('success');
            expect((result as any).result).toBe('sync-result');
        });

        it('执行 Promise Handler', async () => {
            @Node({ title: 'Promise 节点' })
            class PromiseAst extends Ast {
                @Output() result?: string;
                type = 'PromiseAst';
            }

            @Injectable()
            class PromiseVisitor {
                @Handler(PromiseAst)
                async visit(ast: PromiseAst): Promise<INode> {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    ast.state = 'success';
                    ast.result = 'promise-result';
                    return ast as INode;
                }
            }

            const ast = new PromiseAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('success');
            expect((result as any).result).toBe('promise-result');
        });

        it('执行 Observable Handler', async () => {
            @Node({ title: 'Observable 节点' })
            class ObservableAst extends Ast {
                @Output() result?: string;
                type = 'ObservableAst';
            }

            @Injectable()
            class ObservableVisitor {
                @Handler(ObservableAst)
                visit(ast: ObservableAst): Observable<INode> {
                    return new Observable(observer => {
                        ast.state = 'running';
                        observer.next(ast as INode);

                        setTimeout(() => {
                            ast.state = 'success';
                            ast.result = 'observable-result';
                            observer.next(ast as INode);
                            observer.complete();
                        }, 10);
                    });
                }
            }

            const ast = new ObservableAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const states = await lastValueFrom(
                executor.visit(node, workflow).pipe(
                    toArray(),
                    map((results: any[]) => results.map((r: any) => r.state))
                )
            );
            expect(states).toEqual(['running', 'success']);
        });

        it('捕获同步错误', async () => {
            @Node({ title: '错误节点' })
            class ErrorAst extends Ast {
                type = 'ErrorAst';
            }

            @Injectable()
            class ErrorVisitor {
                @Handler(ErrorAst)
                visit(ast: ErrorAst): INode {
                    throw new Error('Sync error');
                }
            }

            const ast = new ErrorAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('fail');
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain('Sync error');
        });

        it('捕获 Promise 错误', async () => {
            @Node({ title: 'Promise 错误节点' })
            class PromiseErrorAst extends Ast {
                type = 'PromiseErrorAst';
            }

            @Injectable()
            class PromiseErrorVisitor {
                @Handler(PromiseErrorAst)
                async visit(ast: PromiseErrorAst): Promise<INode> {
                    throw new Error('Promise error');
                }
            }

            const ast = new PromiseErrorAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('fail');
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain('Promise error');
        });

        it('捕获 Observable 错误', async () => {
            @Node({ title: 'Observable 错误节点' })
            class ObservableErrorAst extends Ast {
                type = 'ObservableErrorAst';
            }

            @Injectable()
            class ObservableErrorVisitor {
                @Handler(ObservableErrorAst)
                visit(ast: ObservableErrorAst): Observable<INode> {
                    return new Observable(observer => {
                        observer.error(new Error('Observable error'));
                    });
                }
            }

            const ast = new ObservableErrorAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('fail');
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain('Observable error');
        });

        it('NoRetryError 特殊处理', async () => {
            @Node({ title: 'NoRetry 节点' })
            class NoRetryAst extends Ast {
                type = 'NoRetryAst';
            }

            @Injectable()
            class NoRetryVisitor {
                @Handler(NoRetryAst)
                visit(ast: NoRetryAst): INode {
                    throw new NoRetryError('Cannot retry');
                }
            }

            const ast = new NoRetryAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('fail');
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain('Cannot retry');
        });

        it('未注册 Handler 使用 DefaultVisitor', async () => {
            @Node({ title: '无处理器节点' })
            class NoHandlerAst extends Ast {
                type = 'NoHandlerAst';
            }

            const ast = new NoHandlerAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await lastValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('success');
        });

        it('Handler 方法不存在抛出错误', async () => {
            @Node({ title: '无效方法节点' })
            class InvalidMethodAst extends Ast {
                type = 'InvalidMethodAst';
            }

            @Injectable()
            class InvalidMethodVisitor {
                // 注册了错误的方法名
                @Handler(InvalidMethodAst)
                wrongMethod(ast: InvalidMethodAst): INode {
                    return ast as INode;
                }
            }

            const visitor = root.get(InvalidMethodVisitor);
            // 删除方法模拟不存在
            delete (visitor as any).wrongMethod;

            const ast = new InvalidMethodAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await lastValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('fail');
            expect(result.error).toBeDefined();
        });

        it('Handler 接收 workflow 上下文', async () => {
            @Node({ title: '上下文节点' })
            class ContextAst extends Ast {
                @Output() workflowId?: string;
                type = 'ContextAst';
            }

            @Injectable()
            class ContextVisitor {
                @Handler(ContextAst)
                visit(ast: ContextAst, ctx: any): INode {
                    ast.state = 'success';
                    ast.workflowId = ctx.id;
                    return ast as INode;
                }
            }

            const ast = new ContextAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });
            workflow.id = 'workflow-123';

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect((result as any).workflowId).toBe('workflow-123');
        });

        it('多次发射正确传递', async () => {
            @Node({ title: '多发射节点' })
            class MultiEmitAst extends Ast {
                @Output() value?: number;
                type = 'MultiEmitAst';
            }

            @Injectable()
            class MultiEmitVisitor {
                @Handler(MultiEmitAst)
                visit(ast: MultiEmitAst): Observable<INode> {
                    return new Observable(observer => {
                        for (let i = 1; i <= 3; i++) {
                            ast.value = i;
                            ast.state = 'emitting';
                            observer.next({ ...ast } as INode);
                        }
                        ast.state = 'success';
                        observer.next(ast as INode);
                        observer.complete();
                    });
                }
            }

            const ast = new MultiEmitAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const values = await lastValueFrom(
                executor.visit(node, workflow).pipe(
                    toArray(),
                    map((results: any[]) =>
                        results
                            .filter((r: any) => r.state === 'emitting')
                            .map((r: any) => r.value)
                    )
                )
            );
            expect(values).toEqual([1, 2, 3]);
        });

        it('Promise 返回 Observable 嵌套处理', async () => {
            @Node({ title: '嵌套节点' })
            class NestedAst extends Ast {
                @Output() result?: string;
                type = 'NestedAst';
            }

            @Injectable()
            class NestedVisitor {
                @Handler(NestedAst)
                async visit(ast: NestedAst): Promise<Observable<INode>> {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return new Observable(observer => {
                        ast.state = 'success';
                        ast.result = 'nested-result';
                        observer.next(ast as INode);
                        observer.complete();
                    });
                }
            }

            const ast = new NestedAst();
            const node = compiler.compile(ast);
            const workflow = createWorkflowGraphAst({ nodes: [], edges: [] });

            const result = await firstValueFrom(executor.visit(node, workflow));
            expect(result.state).toBe('success');
            expect((result as any).result).toBe('nested-result');
        });
    });
});
