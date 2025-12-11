// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { root, Injectable } from '@sker/core';
import { DataFlowManager } from './data-flow-manager';
import { INode, IEdge } from '../types';
import { Node, Input, Output, IS_MULTI, IS_BUFFER } from '../decorator';
import { Ast } from '../ast';
import { Compiler } from '../compiler';
import { of } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';

describe('DataFlowManager', () => {
    let manager: DataFlowManager;

    beforeEach(() => {
        manager = root.get(DataFlowManager);
    });

    describe('extractNodeOutputs()', () => {
        it('提取简单输出', () => {
            @Node({ title: '简单节点' })
            class SimpleAst extends Ast {
                @Output() result?: string;
                type = 'SimpleAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new SimpleAst());
            (node as any).result = 'test-value';

            const outputs = manager.extractNodeOutputs(node);

            expect(outputs.result).toBe('test-value');
        });

        it('提取多输出', () => {
            @Node({ title: '多输出节点' })
            class MultiOutputAst extends Ast {
                @Output() outputA?: string;
                @Output() outputB?: number;
                @Output() outputC?: boolean;
                type = 'MultiOutputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new MultiOutputAst());
            (node as any).outputA = 'text';
            (node as any).outputB = 42;
            (node as any).outputC = true;

            const outputs = manager.extractNodeOutputs(node);

            expect(outputs.outputA).toBe('text');
            expect(outputs.outputB).toBe(42);
            expect(outputs.outputC).toBe(true);
        });

        it('忽略 undefined 输出', () => {
            @Node({ title: '部分输出节点' })
            class PartialOutputAst extends Ast {
                @Output() defined?: string;
                @Output() undefined?: string;
                type = 'PartialOutputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new PartialOutputAst());
            (node as any).defined = 'value';

            const outputs = manager.extractNodeOutputs(node);

            expect(outputs.defined).toBe('value');
            expect('undefined' in outputs).toBe(false);
        });

        it('提取嵌套对象输出', () => {
            @Node({ title: '嵌套输出节点' })
            class NestedOutputAst extends Ast {
                @Output() data?: { user: { name: string; age: number } };
                type = 'NestedOutputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new NestedOutputAst());
            (node as any).data = { user: { name: 'Alice', age: 30 } };

            const outputs = manager.extractNodeOutputs(node);

            expect(outputs.data.user.name).toBe('Alice');
            expect(outputs.data.user.age).toBe(30);
        });
    });

    describe('assignInputsToNode()', () => {
        it('分配单输入', () => {
            @Node({ title: '目标节点' })
            class TargetAst extends Ast {
                @Input() input?: string;
                type = 'TargetAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new TargetAst());

            const allOutputs = new Map<string, any>();
            allOutputs.set('source', { output: 'test-value' });

            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'source',
                    to: targetNode.id!,
                    fromProperty: 'output',
                    toProperty: 'input',
                },
            ];

            manager.assignInputsToNode(targetNode, allOutputs, edges, []);

            expect((targetNode as any).input).toBe('test-value');
        });

        it('IS_MULTI 多值聚合', () => {
            @Node({ title: '聚合节点' })
            class AggregateAst extends Ast {
                @Input({ mode: IS_MULTI }) inputs: string[] = [];
                type = 'AggregateAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new AggregateAst());

            const allOutputs = new Map<string, any>();
            allOutputs.set('source1', { value: 'A' });
            allOutputs.set('source2', { value: 'B' });
            allOutputs.set('source3', { value: 'C' });

            const edges: IEdge[] = [
                { id: '1', from: 'source1', to: targetNode.id!, fromProperty: 'value', toProperty: 'inputs' },
                { id: '2', from: 'source2', to: targetNode.id!, fromProperty: 'value', toProperty: 'inputs' },
                { id: '3', from: 'source3', to: targetNode.id!, fromProperty: 'value', toProperty: 'inputs' },
            ];

            const allNodes: INode[] = [];
            manager.assignInputsToNode(targetNode, allOutputs, edges, allNodes);

            expect((targetNode as any).inputs).toHaveLength(3);
            expect((targetNode as any).inputs).toContain('A');
            expect((targetNode as any).inputs).toContain('B');
            expect((targetNode as any).inputs).toContain('C');
        });

        it('嵌套属性路径映射', () => {
            @Node({ title: '目标节点' })
            class TargetAst extends Ast {
                @Input() userName?: string;
                type = 'TargetAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new TargetAst());

            const allOutputs = new Map<string, any>();
            allOutputs.set('source', { user: { name: 'Alice', age: 30 } });

            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'source',
                    to: targetNode.id!,
                    fromProperty: 'user.name',
                    toProperty: 'userName',
                },
            ];

            manager.assignInputsToNode(targetNode, allOutputs, edges, []);

            expect((targetNode as any).userName).toBe('Alice');
        });

        it('条件边满足时分配', () => {
            @Node({ title: '目标节点' })
            class TargetAst extends Ast {
                @Input() input?: string;
                type = 'TargetAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new TargetAst());

            const sourceNode: INode = {
                id: 'source',
                type: 'SourceAst',
                state: 'success',
                count: 1,
                emitCount: 1,
                position: { x: 0, y: 0 },
                status: 'active',
                metadata: { class: {}, inputs: [], outputs: [], states: [] },
            };

            const allOutputs = new Map<string, any>();
            allOutputs.set('source', { data: 'conditional-value' });

            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'source',
                    to: targetNode.id!,
                    fromProperty: 'data',
                    toProperty: 'input',
                    condition: { property: 'status', value: 'active' },
                },
            ];

            manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

            expect((targetNode as any).input).toBe('conditional-value');
        });

        it('条件边不满足时不分配', () => {
            @Node({ title: '目标节点' })
            class TargetAst extends Ast {
                @Input() input?: string;
                type = 'TargetAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new TargetAst());

            const sourceNode: INode = {
                id: 'source',
                type: 'SourceAst',
                state: 'success',
                count: 1,
                emitCount: 1,
                position: { x: 0, y: 0 },
                status: 'inactive',
                metadata: { class: {}, inputs: [], outputs: [], states: [] },
            };

            const allOutputs = new Map<string, any>();
            allOutputs.set('source', { data: 'should-not-assign' });

            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'source',
                    to: targetNode.id!,
                    fromProperty: 'data',
                    toProperty: 'input',
                    condition: { property: 'status', value: 'active' },
                },
            ];

            manager.assignInputsToNode(targetNode, allOutputs, edges, [sourceNode]);

            expect((targetNode as any).input).toBeUndefined();
        });

        it('边权重排序', () => {
            @Node({ title: '目标节点' })
            class TargetAst extends Ast {
                @Input() input?: string;
                type = 'TargetAst';
            }

            const compiler = root.get(Compiler);
            const targetNode = compiler.compile(new TargetAst());

            const allOutputs = new Map<string, any>();
            allOutputs.set('source1', { value: 'first' });
            allOutputs.set('source2', { value: 'second' });

            const edges: IEdge[] = [
                { id: '1', from: 'source1', to: targetNode.id!, fromProperty: 'value', toProperty: 'input', weight: 10 },
                { id: '2', from: 'source2', to: targetNode.id!, fromProperty: 'value', toProperty: 'input', weight: 1 },
            ];

            manager.assignInputsToNode(targetNode, allOutputs, edges, []);

            // 权重小的先处理，权重大的后处理，后处理的会覆盖前面的值（单值模式）
            expect((targetNode as any).input).toBe('first');
        });
    });

    describe('createEdgeOperator()', () => {
        it('fromProperty 提取属性', async () => {
            const edge: IEdge = {
                id: '1',
                from: 'source',
                to: 'target',
                fromProperty: 'result',
            };

            const operator = manager.createEdgeOperator(edge);
            const source = of({ result: 'test-value', other: 'ignore' });

            const value = await firstValueFrom(source.pipe(operator));
            expect(value).toBe('test-value');
        });

        it('嵌套 fromProperty 提取', async () => {
            const edge: IEdge = {
                id: '1',
                from: 'source',
                to: 'target',
                fromProperty: 'user.name',
            };

            const operator = manager.createEdgeOperator(edge);
            const source = of({ user: { name: 'Alice', age: 30 } });

            const value = await firstValueFrom(source.pipe(operator));
            expect(value).toBe('Alice');
        });

        it('condition 条件过滤', async () => {
            const edge: IEdge = {
                id: '1',
                from: 'source',
                to: 'target',
                condition: { property: 'status', value: 'active' },
            };

            const operator = manager.createEdgeOperator(edge);
            const source = of(
                { status: 'inactive', data: 'A' },
                { status: 'active', data: 'B' },
                { status: 'inactive', data: 'C' }
            );

            const results = await firstValueFrom(source.pipe(operator, toArray()));
            expect(results).toHaveLength(1);
            expect(results[0].data).toBe('B');
        });

        it('fromProperty + condition 组合', async () => {
            const edge: IEdge = {
                id: '1',
                from: 'source',
                to: 'target',
                fromProperty: 'data',
                condition: { property: 'status', value: 'ok' },
            };

            const operator = manager.createEdgeOperator(edge);
            const source = of(
                { status: 'ok', data: 'pass' },
                { status: 'error', data: 'fail' }
            );

            const results = await firstValueFrom(source.pipe(operator, toArray()));
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('pass');
        });
    });

    describe('initializeInputNodes()', () => {
        it('从 context 初始化输入节点', () => {
            @Node({ title: '输入节点' })
            class InputAst extends Ast {
                @Input() value?: string;
                type = 'InputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new InputAst());
            const nodes = [node];
            const edges: IEdge[] = [];
            const context = { value: 'from-context' };

            manager.initializeInputNodes(nodes, edges, context);

            expect((node as any).value).toBe('from-context');
        });

        it('优先使用 nodeId.property 格式', () => {
            @Node({ title: '输入节点' })
            class InputAst extends Ast {
                @Input() value?: string;
                type = 'InputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new InputAst());
            node.id = 'node1';
            const nodes = [node];
            const edges: IEdge[] = [];
            const context = {
                value: 'global',
                'node1.value': 'specific',
            };

            manager.initializeInputNodes(nodes, edges, context);

            expect((node as any).value).toBe('specific');
        });

        it('有入边时不初始化', () => {
            @Node({ title: '输入节点' })
            class InputAst extends Ast {
                @Input() value?: string;
                type = 'InputAst';
            }

            const compiler = root.get(Compiler);
            const node = compiler.compile(new InputAst());
            node.id = 'node1';
            const nodes = [node];
            const edges: IEdge[] = [
                { id: '1', from: 'source', to: 'node1', toProperty: 'value' },
            ];
            const context = { value: 'should-not-assign' };

            manager.initializeInputNodes(nodes, edges, context);

            expect((node as any).value).toBeUndefined();
        });
    });
});
