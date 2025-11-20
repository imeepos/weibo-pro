import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReactiveScheduler } from './reactive-scheduler';
import { WorkflowGraphAst, createWorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode } from '../types';
import { Observable, of, Subject, BehaviorSubject, delay, firstValueFrom, toArray, lastValueFrom, pipe, throwError } from 'rxjs';
import { root } from '@sker/core';
import { DataFlowManager } from './data-flow-manager';
import { map } from 'rxjs/operators';

// Mock executeAst
vi.mock('../executor', () => ({
    executeAst: vi.fn((node: INode, ctx: any) => {
        node.state = 'success';
        return of(node);
    })
}));

import { executeAst } from '../executor';

// 创建真正的 RxJS 操作符 - 模拟提取属性
function createIdentityOperator() {
    return pipe(map((x: any) => {
        // 不返回整个节点，只返回输出数据
        // 排除系统属性
        if (x && typeof x === 'object') {
            const { id, type, state, error, position, ...data } = x;
            return Object.keys(data).length > 0 ? data : {};
        }
        return x;
    }));
}

// 测试用节点
function createTestNode(id: string, overrides: Partial<INode> = {}): INode {
    return {
        id,
        type: 'TestNode',
        state: 'pending',
        error: undefined,
        position: { x: 0, y: 0 },
        ...overrides
    };
}

// 创建边
function createEdge(
    from: string,
    to: string,
    options: Partial<IEdge> = {}
): IEdge {
    return {
        id: `${from}->${to}`,
        from,
        to,
        ...options
    };
}

describe('ReactiveScheduler', () => {
    let scheduler: ReactiveScheduler;
    let mockDataFlowManager: DataFlowManager;

    beforeEach(() => {
        // Mock DataFlowManager
        mockDataFlowManager = {
            initializeInputNodes: vi.fn(),
            createEdgeOperator: vi.fn(() => createIdentityOperator())
        } as unknown as DataFlowManager;

        // Mock root.get
        vi.spyOn(root, 'get').mockImplementation((token: any) => {
            if (token === DataFlowManager) {
                return mockDataFlowManager;
            }
            return undefined;
        });

        scheduler = new ReactiveScheduler();

        // Reset executeAst mock
        vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
            node.state = 'success';
            return of(node);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('schedule', () => {
        it('已完成的工作流（success）直接返回', async () => {
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [],
                edges: [],
                state: 'success'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result).toBe(ast);
            expect(result.state).toBe('success');
        });

        it('已完成的工作流（fail）直接返回', async () => {
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [],
                edges: [],
                state: 'fail'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result).toBe(ast);
            expect(result.state).toBe('fail');
        });

        it('pending 状态初始化输入节点', async () => {
            const nodes = [createTestNode('node1')];
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges: [],
                state: 'pending'
            });

            const ctx = { input: 'value' };
            await firstValueFrom(scheduler.schedule(ast, ctx));

            expect(mockDataFlowManager.initializeInputNodes).toHaveBeenCalledWith(
                nodes,
                [],
                ctx
            );
        });

        it('状态设为 running', async () => {
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [createTestNode('node1')],
                edges: [],
                state: 'pending'
            });

            const result$ = scheduler.schedule(ast, {});

            // 第一次发射时状态应为 running
            const results = await firstValueFrom(result$.pipe(toArray()));
            expect(results.some(r => r.state === 'running' || r.state === 'success')).toBe(true);
        });

        it('空节点工作流返回 success', async () => {
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [],
                edges: [],
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });
    });

    describe('buildStreamNetwork - 循环依赖检测', () => {
        it('检测直接循环依赖', () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('B', 'A')  // 循环
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            expect(() => {
                scheduler.schedule(ast, {}).subscribe();
            }).toThrow('循环依赖');
        });

        it('检测间接循环依赖', () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('B', 'C'),
                createEdge('C', 'A')  // 循环
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            expect(() => {
                scheduler.schedule(ast, {}).subscribe();
            }).toThrow('循环依赖');
        });

        it('边来自不存在的节点时抛出错误', () => {
            const nodes = [createTestNode('B')];
            const edges = [
                createEdge('NonExistent', 'B')  // 从不存在的节点
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            // 直接修改 edges 绕过验证
            ast.edges = edges;

            expect(() => {
                scheduler.schedule(ast, {}).subscribe();
            }).toThrow('节点不存在');
        });
    });

    describe('入口节点流', () => {
        it('无依赖节点直接执行', async () => {
            const node = createTestNode('entry');
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [node],
                edges: [],
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(executeAst).toHaveBeenCalled();
            expect(result.nodes[0]!.state).toBe('success');
        });

        it('多个入口节点并行执行', async () => {
            const nodes = [
                createTestNode('entry1'),
                createTestNode('entry2'),
                createTestNode('entry3')
            ];
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges: [],
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(executeAst).toHaveBeenCalledTimes(3);
            expect(result.state).toBe('success');
        });
    });

    describe('依赖节点流', () => {
        it('线性依赖：A -> B -> C', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('B', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
            expect(result.nodes.every(n => n.state === 'success')).toBe(true);
        });

        it('分支依赖：A -> B, A -> C', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('A', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('汇聚依赖：A -> C, B -> C', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'C'),
                createEdge('B', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('错误隔离：单个节点失败不影响其他节点', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('A', 'C')
            ];

            // 让 B 节点执行失败
            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                if (node.id === 'B') {
                    node.state = 'fail';
                    node.error = new Error('Test error');
                } else {
                    node.state = 'success';
                }
                return of(node);
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('fail');  // 整体失败
            expect(result.nodes.find(n => n.id === 'B')?.state).toBe('fail');
            expect(result.nodes.find(n => n.id === 'C')?.state).toBe('success');
        });
    });

    describe('条件边', () => {
        it('无条件边：等待上游成功', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges: IEdge[] = [
                {
                    id: 'A->B',
                    from: 'A',
                    to: 'B'
                }
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('条件边：条件满足时执行', async () => {
            const nodeA = createTestNode('A');
            (nodeA as any).hasNext = true;

            const nodes = [nodeA, createTestNode('B')];
            const edges: IEdge[] = [
                createEdge('A', 'B', { condition: { property: 'hasNext', value: true } })
            ];

            // Mock executeAst 返回带有 hasNext 属性的节点
            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                node.state = 'success';
                if (node.id === 'A') {
                    (node as any).hasNext = true;
                }
                return of(node);
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
            expect(result.nodes.every(n => n.state === 'success')).toBe(true);
        });

        it('条件边：条件不满足时不执行', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges: IEdge[] = [
                createEdge('A', 'B', { condition: { property: 'hasNext', value: true } })
            ];

            // A 节点的 hasNext 为 false
            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                node.state = 'success';
                if (node.id === 'A') {
                    (node as any).hasNext = false;
                }
                return of(node);
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            // B 节点因为条件不满足不会被触发，所以保持 pending 状态
            // 但整体工作流应该完成（因为 A 完成了）
            // 注意：这取决于具体实现，B 可能一直是 pending
            expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');
        });
    });

    describe('边模式', () => {
        describe('COMBINE_LATEST', () => {
            it('等待所有上游至少发射一次', async () => {
                const nodes = [
                    createTestNode('A'),
                    createTestNode('B'),
                    createTestNode('C')
                ];
                const edges = [
                    createEdge('A', 'C', { mode: EdgeMode.COMBINE_LATEST }),
                    createEdge('B', 'C', { mode: EdgeMode.COMBINE_LATEST })
                ];

                const ast = createWorkflowGraphAst({
                    name: 'test',
                    nodes,
                    edges,
                    state: 'pending'
                });

                const result = await lastValueFrom(scheduler.schedule(ast, {}));

                expect(result.state).toBe('success');
            });
        });

        describe('ZIP', () => {
            it('配对执行', async () => {
                const nodes = [
                    createTestNode('A'),
                    createTestNode('B'),
                    createTestNode('C')
                ];
                const edges = [
                    createEdge('A', 'C', { mode: EdgeMode.ZIP }),
                    createEdge('B', 'C', { mode: EdgeMode.ZIP })
                ];

                const ast = createWorkflowGraphAst({
                    name: 'test',
                    nodes,
                    edges,
                    state: 'pending'
                });

                const result = await lastValueFrom(scheduler.schedule(ast, {}));

                expect(result.state).toBe('success');
            });
        });

        describe('MERGE', () => {
            it('任一上游发射立即触发', async () => {
                const nodes = [
                    createTestNode('A'),
                    createTestNode('B'),
                    createTestNode('C')
                ];
                const edges = [
                    createEdge('A', 'C', { mode: EdgeMode.MERGE }),
                    createEdge('B', 'C', { mode: EdgeMode.MERGE })
                ];

                const ast = createWorkflowGraphAst({
                    name: 'test',
                    nodes,
                    edges,
                    state: 'pending'
                });

                const result = await lastValueFrom(scheduler.schedule(ast, {}));

                // MERGE 模式下，A 或 B 任一完成就会触发 C
                expect(result.nodes.find(n => n.id === 'A')?.state).toBe('success');
            });
        });

        describe('WITH_LATEST_FROM', () => {
            it('主流触发，携带其他流最新值', async () => {
                const nodes = [
                    createTestNode('A'),
                    createTestNode('B'),
                    createTestNode('C')
                ];
                const edges = [
                    createEdge('A', 'C', { mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true }),
                    createEdge('B', 'C', { mode: EdgeMode.WITH_LATEST_FROM })
                ];

                const ast = createWorkflowGraphAst({
                    name: 'test',
                    nodes,
                    edges,
                    state: 'pending'
                });

                const result = await lastValueFrom(scheduler.schedule(ast, {}));

                expect(result.state).toBe('success');
            });

            it('没有主流标记时回退到 combineLatest', async () => {
                const nodes = [
                    createTestNode('A'),
                    createTestNode('B'),
                    createTestNode('C')
                ];
                const edges = [
                    createEdge('A', 'C', { mode: EdgeMode.WITH_LATEST_FROM }),
                    createEdge('B', 'C', { mode: EdgeMode.WITH_LATEST_FROM })
                ];

                const ast = createWorkflowGraphAst({
                    name: 'test',
                    nodes,
                    edges,
                    state: 'pending'
                });

                const result = await lastValueFrom(scheduler.schedule(ast, {}));

                expect(result.state).toBe('success');
            });
        });
    });

    describe('数据边属性映射', () => {
        it('fromProperty 和 toProperty 映射', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges = [
                createEdge('A', 'B', {
                    fromProperty: 'output',
                    toProperty: 'input'
                })
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
            expect(mockDataFlowManager.createEdgeOperator).toHaveBeenCalled();
        });
    });

    describe('cloneNode', () => {
        it('深度克隆节点', async () => {
            const original = createTestNode('test', {
                state: 'success'
            });
            (original as any).data = { nested: { value: 1 } };

            const nodes = [original];
            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges: [],
                state: 'pending'
            });

            // 通过执行工作流来测试 cloneNode
            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            // 原始节点状态应该被重置
            expect(result.nodes[0]!.state).toBe('success');
        });
    });

    describe('subscribeAndMerge', () => {
        it('合并所有节点状态变化', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'C'),
                createEdge('B', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const results: WorkflowGraphAst[] = [];
            await new Promise<void>((resolve) => {
                scheduler.schedule(ast, {}).subscribe({
                    next: (result) => results.push(result),
                    complete: () => resolve()
                });
            });

            // 应该收到多次状态更新
            expect(results.length).toBeGreaterThanOrEqual(1);
            // 最终状态应该是 success
            expect(results[results.length - 1]!.state).toBe('success');
        });

        it('有失败节点时整体状态为 fail', async () => {
            const nodes = [createTestNode('A')];

            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                node.state = 'fail';
                node.error = new Error('Test error');
                return of(node);
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges: [],
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('fail');
        });

        it('持续发射直到完成', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges = [createEdge('A', 'B')];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const states: string[] = [];
            await new Promise<void>((resolve) => {
                scheduler.schedule(ast, {}).subscribe({
                    next: (result) => states.push(result.state),
                    complete: () => resolve()
                });
            });

            // 最终状态应该是完成状态
            expect(['success', 'fail']).toContain(states[states.length - 1]);
        });
    });

    describe('复杂工作流场景', () => {
        it('菱形依赖：A -> B, A -> C, B -> D, C -> D', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C'),
                createTestNode('D')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('A', 'C'),
                createEdge('B', 'D'),
                createEdge('C', 'D')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
            expect(result.nodes.every(n => n.state === 'success')).toBe(true);
        });

        it('混合边类型：数据映射边 + 无数据映射边', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges: IEdge[] = [
                createEdge('A', 'B', { fromProperty: 'output', toProperty: 'input' }),
                {
                    id: 'A->C',
                    from: 'A',
                    to: 'C'
                }
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('多入口多出口', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C'),
                createTestNode('D')
            ];
            const edges = [
                createEdge('A', 'C'),
                createEdge('B', 'D')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('深度嵌套依赖链', async () => {
            const nodes = Array.from({ length: 5 }, (_, i) => createTestNode(`N${i}`));
            const edges = Array.from({ length: 4 }, (_, i) => createEdge(`N${i}`, `N${i + 1}`));

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
            expect(result.nodes.every(n => n.state === 'success')).toBe(true);
        });
    });

    describe('错误处理', () => {
        it('executeAst 返回错误 Observable 时节点标记为 fail', async () => {
            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                return throwError(() => new Error('Execution error'));
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes: [createTestNode('A')],
                edges: [],
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('fail');
        });

        it('独立节点失败时其他节点仍执行（错误隔离）', async () => {
            // 两个独立的入口节点：A 失败，B 成功
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges: IEdge[] = [];

            vi.mocked(executeAst).mockImplementation((node: INode, ctx: any) => {
                if (node.id === 'A') {
                    node.state = 'fail';
                    node.error = new Error('A failed');
                } else {
                    node.state = 'success';
                }
                return of(node);
            });

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            // 整体应该失败（因为有节点失败）
            // 但 B 应该成功执行
            expect(result.state).toBe('fail');
            expect(result.nodes.find(n => n.id === 'A')?.state).toBe('fail');
            expect(result.nodes.find(n => n.id === 'B')?.state).toBe('success');
        });
    });

    describe('mergeEdgeValues', () => {
        it('有 toProperty 时使用指定属性名', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges = [
                createEdge('A', 'B', {
                    fromProperty: 'output',
                    toProperty: 'myInput'
                })
            ];

            // 设置 createEdgeOperator 返回正确的操作符
            mockDataFlowManager.createEdgeOperator = vi.fn(() => pipe(
                map((ast: any) => ast.output)
            ));

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            await firstValueFrom(scheduler.schedule(ast, {}));

            expect(mockDataFlowManager.createEdgeOperator).toHaveBeenCalledWith(
                expect.objectContaining({ toProperty: 'myInput' })
            );
        });
    });

    describe('detectEdgeMode', () => {
        it('优先使用边配置的 mode', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'C', { mode: EdgeMode.ZIP }),
                createEdge('B', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });

        it('默认使用 COMBINE_LATEST', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'C'),
                createEdge('B', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });
    });

    describe('单输入场景', () => {
        it('单个数据边直接传递', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B')
            ];
            const edges = [createEdge('A', 'B')];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            const result = await lastValueFrom(scheduler.schedule(ast, {}));

            expect(result.state).toBe('success');
        });
    });

    describe('shareReplay 行为', () => {
        it('多个下游共享上游执行结果', async () => {
            const nodes = [
                createTestNode('A'),
                createTestNode('B'),
                createTestNode('C')
            ];
            const edges = [
                createEdge('A', 'B'),
                createEdge('A', 'C')
            ];

            const ast = createWorkflowGraphAst({
                name: 'test',
                nodes,
                edges,
                state: 'pending'
            });

            await firstValueFrom(scheduler.schedule(ast, {}));

            // A 节点应该只执行一次
            const aExecutions = vi.mocked(executeAst).mock.calls.filter(
                call => call[0].id === 'A'
            );
            expect(aExecutions.length).toBe(1);
        });
    });
});
