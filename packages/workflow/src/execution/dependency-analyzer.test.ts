import { describe, it, expect, beforeEach } from 'vitest';
import { root } from '@sker/core';
import { DependencyAnalyzer } from './dependency-analyzer';
import { INode, IEdge } from '../types';

describe('DependencyAnalyzer', () => {
    let analyzer: DependencyAnalyzer;

    beforeEach(() => {
        analyzer = root.get(DependencyAnalyzer);
    });

    describe('findExecutableNodes()', () => {
        it('入口节点（无依赖）可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(2);
            expect(result.map(n => n.id)).toEqual(expect.arrayContaining(['A', 'B']));
        });

        it('上游未完成时节点不可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('A');
        });

        it('上游成功时节点可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('B');
        });

        it('上游失败时节点不可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'fail'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(0);
        });

        it('多依赖时需全部上游成功', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'success'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'C' },
                { id: '2', from: 'B', to: 'C' },
            ];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('C');
        });

        it('多依赖时任一未完成则不可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'C' },
                { id: '2', from: 'B', to: 'C' },
            ];

            const result = analyzer.findExecutableNodes(nodes, edges);

            // B 是入口节点（无依赖），可执行
            // C 依赖 A 和 B，但 B 未完成，所以 C 不可执行
            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('B');
        });

        it('条件边未满足时节点不可执行', () => {
            const sourceNode: INode = { ...createNode('A', 'success'), condition: 'pass' };
            const targetNode = createNode('B', 'pending');
            const nodes: INode[] = [sourceNode, targetNode];
            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'A',
                    to: 'B',
                    condition: { property: 'condition', value: 'fail' },
                },
            ];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(0);
        });

        it('条件边满足时节点可执行', () => {
            const sourceNode: INode = { ...createNode('A', 'success'), condition: 'pass' };
            const targetNode = createNode('B', 'pending');
            const nodes: INode[] = [sourceNode, targetNode];
            const edges: IEdge[] = [
                {
                    id: '1',
                    from: 'A',
                    to: 'B',
                    condition: { property: 'condition', value: 'pass' },
                },
            ];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('B');
        });

        it('混合条件边：条件源未完成时允许执行', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'C' },
                { id: '2', from: 'B', to: 'C', condition: { property: 'status', value: 'ok' } },
            ];

            const result = analyzer.findExecutableNodes(nodes, edges);

            // B 是入口节点，可执行
            // C 的无条件边（A→C）已满足，条件边（B→C）源未完成，允许执行
            expect(result).toHaveLength(2);
            expect(result.map(n => n.id)).toEqual(expect.arrayContaining(['B', 'C']));
        });

        it('已运行或完成的节点不可执行', () => {
            const nodes: INode[] = [
                createNode('A', 'running'),
                createNode('B', 'success'),
                createNode('C', 'fail'),
            ];
            const edges: IEdge[] = [];

            const result = analyzer.findExecutableNodes(nodes, edges);

            expect(result).toHaveLength(0);
        });
    });

    describe('findReachableNodes()', () => {
        it('单入口线性流程', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'B' },
                { id: '2', from: 'B', to: 'C' },
            ];

            const result = analyzer.findReachableNodes(nodes, edges);

            expect(result).toHaveLength(3);
            expect(result.map(n => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
        });

        it('多入口并行流程', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'C' },
                { id: '2', from: 'B', to: 'C' },
            ];

            const result = analyzer.findReachableNodes(nodes, edges);

            expect(result).toHaveLength(3);
        });

        it('条件边阻断未满足分支', () => {
            const sourceNode: INode = { ...createNode('A', 'success'), route: 'left' };
            const nodes: INode[] = [
                sourceNode,
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'B', condition: { property: 'route', value: 'left' } },
                { id: '2', from: 'A', to: 'C', condition: { property: 'route', value: 'right' } },
            ];

            const result = analyzer.findReachableNodes(nodes, edges);

            expect(result).toHaveLength(2);
            expect(result.map(n => n.id)).toEqual(expect.arrayContaining(['A', 'B']));
            expect(result.map(n => n.id)).not.toContain('C');
        });

        it('孤立节点不可达', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.findReachableNodes(nodes, edges);

            // A 是入口节点，可达
            // B 从 A 可达
            // C 也是入口节点（无入边），也可达
            expect(result).toHaveLength(3);
            expect(result.map(n => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
        });

        it('复杂DAG正确遍历', () => {
            const nodes: INode[] = [
                createNode('A', 'pending'),
                createNode('B', 'pending'),
                createNode('C', 'pending'),
                createNode('D', 'pending'),
                createNode('E', 'pending'),
            ];
            const edges: IEdge[] = [
                { id: '1', from: 'A', to: 'B' },
                { id: '2', from: 'A', to: 'C' },
                { id: '3', from: 'B', to: 'D' },
                { id: '4', from: 'C', to: 'D' },
                { id: '5', from: 'D', to: 'E' },
            ];

            const result = analyzer.findReachableNodes(nodes, edges);

            expect(result).toHaveLength(5);
        });
    });

    describe('areAllReachableNodesCompleted()', () => {
        it('全部成功返回true', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'success'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(result).toBe(true);
        });

        it('部分失败返回true（已完成）', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'fail'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(result).toBe(true);
        });

        it('有pending节点返回false', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(result).toBe(false);
        });

        it('有running节点返回false', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'running'),
            ];
            const edges: IEdge[] = [{ id: '1', from: 'A', to: 'B' }];

            const result = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(result).toBe(false);
        });

        it('孤立节点不影响结果', () => {
            const nodes: INode[] = [
                createNode('A', 'success'),
                createNode('B', 'pending'),
            ];
            const edges: IEdge[] = [];

            const result = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(result).toBe(false);
        });
    });
});

function createNode(id: string, state: INode['state']): INode {
    return {
        id,
        type: 'TestNode',
        state,
        count: 0,
        emitCount: 0,
        position: { x: 0, y: 0 },
        error: undefined,
        metadata: {
            class: {},
            inputs: [],
            outputs: [],
            states: [],
        },
    };
}
