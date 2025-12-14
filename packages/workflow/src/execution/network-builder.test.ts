import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BehaviorSubject, Observable, of, EMPTY, throwError } from 'rxjs';
import { map, tap, toArray, catchError } from 'rxjs/operators';
import { NetworkBuilder, WorkflowEvent, NodeStateEvent, OutputEmitEvent, WorkflowCompleteEvent, WorkflowErrorEvent } from './network-builder';
import { NodeExecutor } from './node-executor';
import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, EdgeMode, isBehaviorSubject, ROUTE_SKIPPED } from '../types';
import { Node, Input, Output, State, Handler, Render } from '../decorator';
import { Injectable } from '@sker/core';

// Mock 依赖
vi.mock('../ast', () => ({
    WorkflowGraphAst: class MockWorkflowGraphAst {
        nodes: INode[] = [];
        edges: IEdge[] = [];
    }
}));

vi.mock('./node-executor', () => ({
    NodeExecutor: class MockNodeExecutor {
        execute(node: INode, ast: any, ctx?: any): Observable<INode> {
            // 默认实现：直接返回节点，状态为 success
            return of({ ...node, state: 'success' as const });
        }
    }
}));

// Mock Node Decorator
function mockNodeDecorator(target: any) {
    // 简化实现，只添加基本的 metadata
    if (!target.prototype.metadata) {
        target.prototype.metadata = {
            class: { type: target.name },
            inputs: [],
            outputs: [],
            states: []
        };
    }
}

// Mock Input Decorator
function mockInputDecorator(options?: { isMulti?: boolean; title?: string; required?: boolean }) {
    return function (target: any, propertyKey: string) {
        if (!target.metadata) {
            target.metadata = {
                class: {},
                inputs: [],
                outputs: [],
                states: []
            };
        }
        target.metadata.inputs.push({
            property: propertyKey,
            isMulti: options?.isMulti ?? false,
            title: options?.title,
            required: options?.required ?? false
        });
    };
}

// Mock Output Decorator
function mockOutputDecorator(options?: { title?: string }) {
    return function (target: any, propertyKey: string) {
        if (!target.metadata) {
            target.metadata = {
                class: {},
                inputs: [],
                outputs: [],
                states: []
            };
        }
        target.metadata.outputs.push({
            property: propertyKey,
            title: options?.title,
            isSubject: true // 标记为 Subject
        });
        // 初始化 BehaviorSubject
        const descriptor = {
            get() {
                if (!this[`__${propertyKey}`]) {
                    this[`__${propertyKey}`] = new BehaviorSubject<any>(null);
                }
                return this[`__${propertyKey}`];
            },
            set(value: any) {
                if (!this[`__${propertyKey}`]) {
                    this[`__${propertyKey}`] = new BehaviorSubject<any>(value);
                } else {
                    this[`__${propertyKey}`].next(value);
                }
            },
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(target, propertyKey, descriptor);
    };
}

// Mock State Decorator
function mockStateDecorator(options?: { title?: string }) {
    return function (target: any, propertyKey: string) {
        if (!target.metadata) {
            target.metadata = {
                class: {},
                inputs: [],
                outputs: [],
                states: []
            };
        }
        target.metadata.states.push({
            propertyKey,
            title: options?.title
        });
    };
}

// Mock Handler Decorator
function mockHandlerDecorator(astClass: any) {
    return function (target: any) {
        // 简化实现
    };
}

// Mock Render Decorator
function mockRenderDecorator(astClass: any) {
    return function (target: any) {
        // 简化实现
    };
}

describe('NetworkBuilder', () => {
    let networkBuilder: NetworkBuilder;
    let mockNodeExecutor: NodeExecutor;
    let ast: WorkflowGraphAst;

    beforeEach(() => {
        // 创建 Mock NodeExecutor 实例
        mockNodeExecutor = new (vi.mocked(NodeExecutor))();
        networkBuilder = new NetworkBuilder(mockNodeExecutor as any);

        // 创建测试用的 AST
        ast = new (vi.mocked(WorkflowGraphAst))();

        // 重置 Mock
        vi.clearAllMocks();
    });

    afterEach(() => {
        networkBuilder.cleanup();
    });

    describe('buildNetwork', () => {
        it('应该构建一个简单的工作流网络', (done) => {
            // 准备测试数据
            const node1: INode = {
                id: 'node-1',
                type: 'StartNode',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'StartNode' },
                    inputs: [],
                    outputs: [
                        { property: 'result', title: 'Result', isSubject: true }
                    ],
                    states: []
                }
            };

            const node2: INode = {
                id: 'node-2',
                type: 'ProcessNode',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 100, y: 0 },
                metadata: {
                    class: { type: 'ProcessNode' },
                    inputs: [
                        { property: 'input', title: 'Input', isMulti: false }
                    ],
                    outputs: [
                        { property: 'output', title: 'Output', isSubject: true }
                    ],
                    states: []
                }
            };

            const edge: IEdge = {
                id: 'edge-1',
                from: 'node-1',
                to: 'node-2',
                fromProperty: 'result',
                toProperty: 'input',
                mode: EdgeMode.MERGE
            };

            ast.nodes = [node1, node2];
            ast.edges = [edge];

            // Mock NodeExecutor 执行
            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation((node: INode) => {
                    if (node.id === 'node-1') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject('hello')
                        } as any);
                    } else if (node.id === 'node-2') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__output`]: new BehaviorSubject('world')
                        } as any);
                    }
                    return of({ ...node, state: 'success' });
                });

            // 执行测试
            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({ data: 'start' });

            return new Promise<void>((resolve, reject) => {
                const events: WorkflowEvent[] = [];
                input$.pipe(network, toArray()).subscribe({
                    next: (result) => {
                        events.push(...result);
                        // 验证事件
                        expect(events.length).toBeGreaterThan(0);

                        const nodeStateEvents = events.filter(e => e.type === 'node_state') as NodeStateEvent[];
                        const outputEvents = events.filter(e => e.type === 'output_emit') as OutputEmitEvent[];
                        const completeEvents = events.filter(e => e.type === 'workflow_complete') as WorkflowCompleteEvent[];

                        expect(nodeStateEvents.length).toBeGreaterThan(0);
                        expect(outputEvents.length).toBeGreaterThan(0);
                        expect(completeEvents.length).toBe(1);

                        resolve();
                    },
                    error: (err) => {
                        reject(err);
                    }
                });
            });
        });

        it('应该处理空的工作流', async () => {
            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            const events = await input$.pipe(network, toArray()).toPromise();
            expect(events.length).toBe(1);
            expect(events[0].type).toBe('workflow_complete');
        });

        it('应该正确处理节点执行失败', async () => {
            const node1: INode = {
                id: 'node-1',
                type: 'ErrorNode',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                error: undefined,
                metadata: {
                    class: { type: 'ErrorNode' },
                    inputs: [],
                    outputs: [],
                    states: []
                }
            };

            ast.nodes = [node1];

            // Mock NodeExecutor 抛出错误
            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation(() => throwError(() => new Error('Test error')));

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            try {
                const events = await input$.pipe(network, toArray()).toPromise();
                const errorEvents = events.filter(e => e.type === 'workflow_error') as WorkflowErrorEvent[];
                expect(errorEvents.length).toBeGreaterThan(0);
                expect(errorEvents[0].error).toBeDefined();
            } catch (err) {
                // 如果流因为错误而终止，这也是预期的
                expect(err).toBeDefined();
            }
        });
    });

    describe('createNodeExecutor', () => {
        it('应该创建节点执行器操作符', async () => {
            const node: INode = {
                id: 'test-node',
                type: 'TestNode',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'TestNode' },
                    inputs: [],
                    outputs: [],
                    states: []
                }
            };

            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation(() => of({ ...node, state: 'success' }));

            const executor = networkBuilder.createNodeExecutor(node, ast, ast);
            const input$ = of({ value: 'test' });

            const events = await input$.pipe(executor, toArray()).toPromise();
            expect(events.length).toBeGreaterThan(0);
            const nodeStateEvents = events.filter(e => e.type === 'node_state') as NodeStateEvent[];
            expect(nodeStateEvents.length).toBeGreaterThan(0);
            expect(nodeStateEvents[0].nodeId).toBe('test-node');
        });
    });

    describe('createEdgeMerger', () => {
        it('应该创建 MERGE 模式的边合并器', (done) => {
            const source1$ = of('value1');
            const source2$ = of('value2');
            const sources = [source1$, source2$];
            const toProperties = ['prop1', 'prop2'];

            const merger = networkBuilder.createEdgeMerger(EdgeMode.MERGE, sources, toProperties);
            const input$ = of({});

            input$.pipe(merger, toArray()).subscribe({
                next: (values) => {
                    expect(values).toEqual(['value1', 'value2']);
                    done();
                },
                error: done
            });
        });

        it('应该创建 ZIP 模式的边合并器', (done) => {
            const source1$ = of('value1');
            const source2$ = of('value2');
            const sources = [source1$, source2$];
            const toProperties = ['prop1', 'prop2'];

            const merger = networkBuilder.createEdgeMerger(EdgeMode.ZIP, sources, toProperties);
            const input$ = of({});

            input$.pipe(merger, toArray()).subscribe({
                next: (values) => {
                    expect(values.length).toBe(1);
                    const combined = values[0];
                    expect(combined.prop1).toBe('value1');
                    expect(combined.prop2).toBe('value2');
                    done();
                },
                error: done
            });
        });

        it('应该创建 COMBINE_LATEST 模式的边合并器', (done) => {
            const source1$ = of('value1');
            const source2$ = of('value2');
            const sources = [source1$, source2$];
            const toProperties = ['prop1', 'prop2'];

            const merger = networkBuilder.createEdgeMerger(EdgeMode.COMBINE_LATEST, sources, toProperties);
            const input$ = of({});

            input$.pipe(merger, toArray()).subscribe({
                next: (values) => {
                    expect(values.length).toBe(1);
                    const combined = values[0];
                    expect(combined.prop1).toBe('value1');
                    expect(combined.prop2).toBe('value2');
                    done();
                },
                error: done
            });
        });

        it('应该创建 WITH_LATEST_FROM 模式的边合并器', (done) => {
            const source1$ = of('primary');
            const source2$ = of('latest');
            const sources = [source1$, source2$];
            const toProperties = ['primary', 'latest'];

            const merger = networkBuilder.createEdgeMerger(EdgeMode.WITH_LATEST_FROM, sources, toProperties);
            const input$ = of({});

            input$.pipe(merger, toArray()).subscribe({
                next: (values) => {
                    expect(values.length).toBe(1);
                    const combined = values[0];
                    expect(combined.primary).toBe('primary');
                    expect(combined.latest).toBe('latest');
                    done();
                },
                error: done
            });
        });
    });

    describe('mergeNodeStreams', () => {
        it('应该合并多个节点事件流', async () => {
            const workflowId = 'test-workflow';

            const node1$ = of(
                { type: 'node_state' as const, nodeId: 'node-1', data: { id: 'node-1' } },
                { type: 'output_emit' as const, nodeId: 'node-1', property: 'result', value: 'hello' }
            );

            const node2$ = of(
                { type: 'node_state' as const, nodeId: 'node-2', data: { id: 'node-2' } },
                { type: 'output_emit' as const, nodeId: 'node-2', property: 'output', value: 'world' }
            );

            const nodeStreams = [node1$, node2$];

            const events = await networkBuilder.mergeNodeStreams(nodeStreams, workflowId).pipe(toArray()).toPromise();
            expect(events.length).toBe(5); // 4个节点事件 + 1个完成事件
            const completeEvent = events.find(e => e.type === 'workflow_complete') as WorkflowCompleteEvent;
            expect(completeEvent).toBeDefined();
            expect(completeEvent.workflowId).toBe(workflowId);
        });
    });

    describe('事件过滤器', () => {
        it('应该过滤节点状态事件', async () => {
            const nodeId = 'test-node';
            const filter = networkBuilder.filterNodeState(nodeId);

            const events$ = of(
                { type: 'node_state', nodeId: 'other-node', data: {} },
                { type: 'node_state', nodeId, data: { id: nodeId } },
                { type: 'output_emit', nodeId, property: 'result', value: 'test' }
            );

            const filteredEvents = await events$.pipe(filter, toArray()).toPromise();
            expect(filteredEvents.length).toBe(1);
            expect(filteredEvents[0].nodeId).toBe(nodeId);
        });

        it('应该过滤输出事件', (done) => {
            const nodeId = 'test-node';
            const property = 'result';
            const filter = networkBuilder.filterOutputEmit(nodeId, property);

            const events$ = of(
                { type: 'output_emit', nodeId: 'other-node', property: 'result', value: 'test' },
                { type: 'output_emit', nodeId, property: 'other', value: 'test' },
                { type: 'output_emit', nodeId, property, value: 'test' }
            );

            events$.pipe(filter, toArray()).subscribe({
                next: (filteredEvents) => {
                    expect(filteredEvents.length).toBe(1);
                    expect(filteredEvents[0].nodeId).toBe(nodeId);
                    expect(filteredEvents[0].property).toBe(property);
                    done();
                },
                error: done
            });
        });

        it('应该过滤工作流完成事件', (done) => {
            const filter = networkBuilder.filterWorkflowComplete();

            const events$ = of(
                { type: 'node_state', nodeId: 'node-1', data: {} },
                { type: 'workflow_complete', workflowId: 'test-workflow' }
            );

            events$.pipe(filter, toArray()).subscribe({
                next: (filteredEvents) => {
                    expect(filteredEvents.length).toBe(1);
                    expect(filteredEvents[0].type).toBe('workflow_complete');
                    done();
                },
                error: done
            });
        });

        it('应该过滤工作流错误事件', (done) => {
            const filter = networkBuilder.filterWorkflowError();

            const events$ = of(
                { type: 'node_state', nodeId: 'node-1', data: {} },
                { type: 'workflow_error', error: new Error('Test error') }
            );

            events$.pipe(filter, toArray()).subscribe({
                next: (filteredEvents) => {
                    expect(filteredEvents.length).toBe(1);
                    expect(filteredEvents[0].type).toBe('workflow_error');
                    done();
                },
                error: done
            });
        });
    });

    describe('多值输入处理', () => {
        it('应该正确处理 isMulti: true 的输入', (done) => {
            const node1: INode = {
                id: 'node-1',
                type: 'Source1',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'Source1' },
                    inputs: [],
                    outputs: [{ property: 'result', title: 'Result', isSubject: true }],
                    states: []
                }
            };

            const node2: INode = {
                id: 'node-2',
                type: 'Source2',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 100, y: 0 },
                metadata: {
                    class: { type: 'Source2' },
                    inputs: [],
                    outputs: [{ property: 'result', title: 'Result', isSubject: true }],
                    states: []
                }
            };

            const node3: INode = {
                id: 'node-3',
                type: 'Aggregator',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 200, y: 0 },
                metadata: {
                    class: { type: 'Aggregator' },
                    inputs: [
                        { property: 'inputs', title: 'Inputs', isMulti: true }
                    ],
                    outputs: [{ property: 'output', title: 'Output', isSubject: true }],
                    states: []
                }
            };

            const edge1: IEdge = {
                id: 'edge-1',
                from: 'node-1',
                to: 'node-3',
                fromProperty: 'result',
                toProperty: 'inputs',
                mode: EdgeMode.MERGE
            };

            const edge2: IEdge = {
                id: 'edge-2',
                from: 'node-2',
                to: 'node-3',
                fromProperty: 'result',
                toProperty: 'inputs',
                mode: EdgeMode.MERGE
            };

            ast.nodes = [node1, node2, node3];
            ast.edges = [edge1, edge2];

            // Mock NodeExecutor
            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation((node: INode) => {
                    if (node.id === 'node-1') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject(['value1'])
                        } as any);
                    } else if (node.id === 'node-2') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject(['value2'])
                        } as any);
                    } else if (node.id === 'node-3') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__output`]: new BehaviorSubject(['value1', 'value2'])
                        } as any);
                    }
                    return of({ ...node, state: 'success' });
                });

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            input$.pipe(network, toArray()).subscribe({
                next: (events) => {
                    const outputEvents = events.filter(e => e.type === 'output_emit') as OutputEmitEvent[];
                    expect(outputEvents.length).toBeGreaterThan(0);
                    const aggregatorOutput = outputEvents.find(e => e.nodeId === 'node-3');
                    expect(aggregatorOutput).toBeDefined();
                    expect(aggregatorOutput?.value).toEqual(['value1', 'value2']);
                    done();
                },
                error: done
            });
        });
    });

    describe('边模式处理', () => {
        it('应该正确处理 MERGE 模式', (done) => {
            const node1: INode = {
                id: 'node-1',
                type: 'Source',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'Source' },
                    inputs: [],
                    outputs: [{ property: 'result', title: 'Result', isSubject: true }],
                    states: []
                }
            };

            const node2: INode = {
                id: 'node-2',
                type: 'MergeTarget',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 100, y: 0 },
                metadata: {
                    class: { type: 'MergeTarget' },
                    inputs: [
                        { property: 'input', title: 'Input', isMulti: false }
                    ],
                    outputs: [{ property: 'output', title: 'Output', isSubject: true }],
                    states: []
                }
            };

            const edge: IEdge = {
                id: 'edge-1',
                from: 'node-1',
                to: 'node-2',
                fromProperty: 'result',
                toProperty: 'input',
                mode: EdgeMode.MERGE
            };

            ast.nodes = [node1, node2];
            ast.edges = [edge];

            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation((node: INode) => {
                    if (node.id === 'node-1') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject('test-value')
                        } as any);
                    } else if (node.id === 'node-2') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__output`]: new BehaviorSubject('processed')
                        } as any);
                    }
                    return of({ ...node, state: 'success' });
                });

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            input$.pipe(network, toArray()).subscribe({
                next: (events) => {
                    const outputEvents = events.filter(e => e.type === 'output_emit') as OutputEmitEvent[];
                    expect(outputEvents.length).toBeGreaterThan(0);
                    done();
                },
                error: done
            });
        });

        it('应该正确处理 ZIP 模式', (done) => {
            const node1: INode = {
                id: 'node-1',
                type: 'Source1',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'Source1' },
                    inputs: [],
                    outputs: [{ property: 'result', title: 'Result', isSubject: true }],
                    states: []
                }
            };

            const node2: INode = {
                id: 'node-2',
                type: 'Source2',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 100, y: 0 },
                metadata: {
                    class: { type: 'Source2' },
                    inputs: [],
                    outputs: [{ property: 'result', title: 'Result', isSubject: true }],
                    states: []
                }
            };

            const node3: INode = {
                id: 'node-3',
                type: 'ZipTarget',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 200, y: 0 },
                metadata: {
                    class: { type: 'ZipTarget' },
                    inputs: [
                        { property: 'input1', title: 'Input1', isMulti: false },
                        { property: 'input2', title: 'Input2', isMulti: false }
                    ],
                    outputs: [{ property: 'output', title: 'Output', isSubject: true }],
                    states: []
                }
            };

            const edge1: IEdge = {
                id: 'edge-1',
                from: 'node-1',
                to: 'node-3',
                fromProperty: 'result',
                toProperty: 'input1',
                mode: EdgeMode.ZIP
            };

            const edge2: IEdge = {
                id: 'edge-2',
                from: 'node-2',
                to: 'node-3',
                fromProperty: 'result',
                toProperty: 'input2',
                mode: EdgeMode.ZIP
            };

            ast.nodes = [node1, node2, node3];
            ast.edges = [edge1, edge2];

            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation((node: INode) => {
                    if (node.id === 'node-1') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject('value1')
                        } as any);
                    } else if (node.id === 'node-2') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__result`]: new BehaviorSubject('value2')
                        } as any);
                    } else if (node.id === 'node-3') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__output`]: new BehaviorSubject({ input1: 'value1', input2: 'value2' })
                        } as any);
                    }
                    return of({ ...node, state: 'success' });
                });

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            input$.pipe(network, toArray()).subscribe({
                next: (events) => {
                    const outputEvents = events.filter(e => e.type === 'output_emit') as OutputEmitEvent[];
                    expect(outputEvents.length).toBeGreaterThan(0);
                    done();
                },
                error: done
            });
        });
    });

    describe('路由节点支持', () => {
        it('应该正确处理路由节点的条件输出', (done) => {
            const node1: INode = {
                id: 'node-1',
                type: 'Router',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'Router' },
                    inputs: [],
                    outputs: [
                        { property: 'case1', title: 'Case 1', isSubject: true, condition: '$input === 1' },
                        { property: 'case2', title: 'Case 2', isSubject: true, condition: '$input === 2' },
                        { property: 'default', title: 'Default', isSubject: true, condition: 'true' }
                    ],
                    states: []
                }
            };

            const node2: INode = {
                id: 'node-2',
                type: 'Target',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 100, y: 0 },
                metadata: {
                    class: { type: 'Target' },
                    inputs: [
                        { property: 'input', title: 'Input', isMulti: false }
                    ],
                    outputs: [{ property: 'output', title: 'Output', isSubject: true }],
                    states: []
                }
            };

            const edge: IEdge = {
                id: 'edge-1',
                from: 'node-1',
                to: 'node-2',
                fromProperty: 'default',
                toProperty: 'input',
                mode: EdgeMode.MERGE
            };

            ast.nodes = [node1, node2];
            ast.edges = [edge];

            vi.spyOn(mockNodeExecutor, 'execute')
                .mockImplementation((node: INode) => {
                    if (node.id === 'node-1') {
                        const routerNode = {
                            ...node,
                            state: 'success',
                            [`__case1`]: new BehaviorSubject(ROUTE_SKIPPED),
                            [`__case2`]: new BehaviorSubject(ROUTE_SKIPPED),
                            [`__default`]: new BehaviorSubject('default-value')
                        } as any;
                        return of(routerNode);
                    } else if (node.id === 'node-2') {
                        return of({
                            ...node,
                            state: 'success',
                            [`__output`]: new BehaviorSubject('processed')
                        } as any);
                    }
                    return of({ ...node, state: 'success' });
                });

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            input$.pipe(network, toArray()).subscribe({
                next: (events) => {
                    const outputEvents = events.filter(e => e.type === 'output_emit') as OutputEmitEvent[];
                    expect(outputEvents.length).toBeGreaterThan(0);
                    done();
                },
                error: done
            });
        });
    });

    describe('cleanup', () => {
        it('应该正确清理订阅', () => {
            const node1: INode = {
                id: 'node-1',
                type: 'Test',
                state: 'pending',
                count: 0,
                emitCount: 0,
                position: { x: 0, y: 0 },
                metadata: {
                    class: { type: 'Test' },
                    inputs: [],
                    outputs: [],
                    states: []
                }
            };

            ast.nodes = [node1];

            const network = networkBuilder.buildNetwork(ast, ast);
            const input$ = of({});

            // 订阅并立即取消
            const subscription = input$.pipe(network).subscribe();

            // 清理
            networkBuilder.cleanup();

            expect(subscription.closed).toBe(true);
        });
    });
});