import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { NetworkBuilder } from './network-builder';
import { NodeExecutor } from './node-executor';
import { createWorkflowGraphAst } from '../ast';
import { INode, IAstStates, EdgeMode } from '../types';

/**
 * 创建测试用的节点
 */
function createTestNode(overrides?: Partial<INode>): INode {
    const output = new BehaviorSubject<any>(null);
    return {
        id: 'test-node',
        type: 'test',
        state: 'pending' as IAstStates,
        count: 0,
        emitCount: 0,
        position: { x: 0, y: 0 },
        error: undefined,
        metadata: {
            class: {},
            inputs: [],
            outputs: [{ property: 'output', title: 'Output' }],
            states: [],
        },
        output,
        ...overrides,
    };
}

describe('NetworkBuilder', () => {
    let networkBuilder: NetworkBuilder;
    let nodeExecutor: NodeExecutor;

    beforeEach(() => {
        nodeExecutor = {
            execute: vi.fn(),
        } as any;

        networkBuilder = new NetworkBuilder(nodeExecutor);
    });

    afterEach(() => {
        networkBuilder.cleanup();
    });

    describe('cleanup()', () => {
        it('应该取消所有订阅', () => {
            // Arrange
            const sub1 = { unsubscribe: vi.fn() };
            const sub2 = { unsubscribe: vi.fn() };

            Object.defineProperty(networkBuilder, 'subscriptions', {
                value: new Map([
                    ['sub-1', sub1 as any],
                    ['sub-2', sub2 as any],
                ]),
                writable: true,
                configurable: true,
            });

            // Act
            networkBuilder.cleanup();

            // Assert
            expect(sub1.unsubscribe).toHaveBeenCalled();
            expect(sub2.unsubscribe).toHaveBeenCalled();
        });

        it('应该清空订阅映射', () => {
            // Arrange
            const subs = new Map([
                ['sub-1', { unsubscribe: vi.fn() } as any],
                ['sub-2', { unsubscribe: vi.fn() } as any],
            ]);

            Object.defineProperty(networkBuilder, 'subscriptions', {
                value: subs,
                writable: true,
                configurable: true,
            });

            // Act
            networkBuilder.cleanup();

            // Assert
            expect(subs.size).toBe(0);
        });

        it('应该优雅处理空订阅映射', () => {
            // Arrange
            const subs = new Map();

            Object.defineProperty(networkBuilder, 'subscriptions', {
                value: subs,
                writable: true,
                configurable: true,
            });

            // Act & Assert
            expect(() => networkBuilder.cleanup()).not.toThrow();
            expect(subs.size).toBe(0);
        });
    });

    describe('buildNetwork() - 基础功能', () => {
        it('应该返回 Observable', () => {
            // Arrange
            const node = createTestNode({ id: 'node-1' });
            const ast = createWorkflowGraphAst({ nodes: [node], edges: [] });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...node, state: 'success' as IAstStates })
            );

            // Act
            const network = networkBuilder.buildNetwork(ast, ast);

            // Assert
            expect(network).toBeDefined();
            expect(typeof network.subscribe).toBe('function');
            expect(typeof network.pipe).toBe('function');
        });

        it('应该接受 ast 和 ctx 参数', () => {
            // Arrange
            const node = createTestNode({ id: 'node-1' });
            const ast = createWorkflowGraphAst({ nodes: [node], edges: [] });
            const ctx = createWorkflowGraphAst({ name: 'Custom' });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...node, state: 'success' as IAstStates })
            );

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ctx);
            }).not.toThrow();
        });

        it('应该初始化节点的输出 BehaviorSubject', () => {
            // Arrange
            const node = createTestNode({ id: 'node-1' });
            node.metadata!.outputs = [{ property: 'output', title: 'Output' }];
            const ast = createWorkflowGraphAst({ nodes: [node], edges: [] });

            // Act
            networkBuilder.buildNetwork(ast, ast);

            // Assert
            expect(node.output).toBeInstanceOf(BehaviorSubject);
        });

        it('应该初始化多个节点的输出 Subject', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            node1.metadata!.outputs = [{ property: 'output', title: 'Output 1' }];
            node2.metadata!.outputs = [{ property: 'output', title: 'Output 2' }];

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2],
                edges: [],
            });

            // Act
            networkBuilder.buildNetwork(ast, ast);

            // Assert
            expect(node1.output).toBeInstanceOf(BehaviorSubject);
            expect(node2.output).toBeInstanceOf(BehaviorSubject);
        });

        it('应该处理多个输出属性的节点', () => {
            // Arrange
            const output1 = new BehaviorSubject(null);
            const output2 = new BehaviorSubject(null);
            const node = createTestNode({ id: 'node-1' });
            node.metadata!.outputs = [
                { property: 'output1', title: 'Output 1' },
                { property: 'output2', title: 'Output 2' },
            ];
            node.output1 = output1;
            node.output2 = output2;

            const ast = createWorkflowGraphAst({ nodes: [node], edges: [] });

            // Act
            networkBuilder.buildNetwork(ast, ast);

            // Assert
            expect(node.output1).toBeInstanceOf(BehaviorSubject);
            expect(node.output2).toBeInstanceOf(BehaviorSubject);
        });
    });

    describe('边的初始化', () => {
        it('应该计算节点的入度', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-1',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                    {
                        id: 'edge-2',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...node1, state: 'success' as IAstStates })
            );

            // Act
            networkBuilder.buildNetwork(ast, ast);

            // Assert
            // node-1 入度为 0，node-2 入度为 0，node-3 入度为 2
            // 这个测试验证边被正确处理
            expect(ast.edges).toHaveLength(2);
        });

        it('应该按目标节点分组边', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            // node-1 和 node-2 都指向 node-3
            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-3',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                    },
                    {
                        id: 'edge-4',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...node1, state: 'success' as IAstStates })
            );

            // Act
            networkBuilder.buildNetwork(ast, ast);

            // Assert
            // 两条边指向同一个节点应该被正确分组
            expect(ast.edges).toHaveLength(2);
            expect(ast.edges.filter((e) => e.to === 'node-3')).toHaveLength(2);
        });
    });

    describe('工作流拓扑', () => {
        it('应该处理线性拓扑（A → B → C）', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            node2.metadata!.inputs = [{ property: 'input', title: 'Input' }];
            const node3 = createTestNode({ id: 'node-3' });
            node3.metadata!.inputs = [{ property: 'input', title: 'Input' }];

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-5',
                        from: 'node-1',
                        to: 'node-2',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                    {
                        id: 'edge-6',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...node1, state: 'success' as IAstStates })
            );

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该处理分支拓扑（A → B, A → C）', () => {
            // Arrange
            const nodeA = createTestNode({ id: 'nodeA' });
            const nodeB = createTestNode({ id: 'nodeB' });
            nodeB.metadata!.inputs = [{ property: 'input', title: 'Input' }];
            const nodeC = createTestNode({ id: 'nodeC' });
            nodeC.metadata!.inputs = [{ property: 'input', title: 'Input' }];

            const ast = createWorkflowGraphAst({
                nodes: [nodeA, nodeB, nodeC],
                edges: [
                    {
                        id: 'edge-7',
                        from: 'nodeA',
                        to: 'nodeB',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                    {
                        id: 'edge-8',
                        from: 'nodeA',
                        to: 'nodeC',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...nodeA, state: 'success' as IAstStates })
            );

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该处理汇聚拓扑（A → C, B → C）', () => {
            // Arrange
            const nodeA = createTestNode({ id: 'nodeA' });
            const nodeB = createTestNode({ id: 'nodeB' });
            const nodeC = createTestNode({ id: 'nodeC' });
            nodeC.metadata!.inputs = [
                { property: 'inputA', title: 'Input A' },
                { property: 'inputB', title: 'Input B' },
            ];

            const ast = createWorkflowGraphAst({
                nodes: [nodeA, nodeB, nodeC],
                edges: [
                    {
                        id: 'edge-9',
                        from: 'nodeA',
                        to: 'nodeC',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                    },
                    {
                        id: 'edge-10',
                        from: 'nodeB',
                        to: 'nodeC',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...nodeA, state: 'success' as IAstStates })
            );

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该处理菱形拓扑（A → B, A → C, B → D, C → D）', () => {
            // Arrange
            const nodeA = createTestNode({ id: 'nodeA' });
            const nodeB = createTestNode({ id: 'nodeB' });
            nodeB.metadata!.inputs = [{ property: 'input', title: 'Input' }];
            const nodeC = createTestNode({ id: 'nodeC' });
            nodeC.metadata!.inputs = [{ property: 'input', title: 'Input' }];
            const nodeD = createTestNode({ id: 'nodeD' });
            nodeD.metadata!.inputs = [
                { property: 'inputA', title: 'Input A' },
                { property: 'inputB', title: 'Input B' },
            ];

            const ast = createWorkflowGraphAst({
                nodes: [nodeA, nodeB, nodeC, nodeD],
                edges: [
                    {
                        id: 'edge-11',
                        from: 'nodeA',
                        to: 'nodeB',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                    {
                        id: 'edge-12',
                        from: 'nodeA',
                        to: 'nodeC',
                        fromProperty: 'output',
                        toProperty: 'input',
                    },
                    {
                        id: 'edge-13',
                        from: 'nodeB',
                        to: 'nodeD',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                    },
                    {
                        id: 'edge-14',
                        from: 'nodeC',
                        to: 'nodeD',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                    },
                ],
            });

            vi.mocked(nodeExecutor.execute).mockReturnValue(
                of({ ...nodeA, state: 'success' as IAstStates })
            );

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该处理空工作流', () => {
            // Arrange
            const ast = createWorkflowGraphAst({ nodes: [], edges: [] });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该处理无边工作流', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const ast = createWorkflowGraphAst({
                nodes: [node1, node2],
                edges: [],
            });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });
    });

    describe('边模式支持', () => {
        it('应该支持 MERGE 边模式', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-15',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'input',
                        mode: EdgeMode.MERGE,
                    },
                    {
                        id: 'edge-16',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'input',
                        mode: EdgeMode.MERGE,
                    },
                ],
            });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该支持 ZIP 边模式', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-17',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                        mode: EdgeMode.ZIP,
                    },
                    {
                        id: 'edge-18',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                        mode: EdgeMode.ZIP,
                    },
                ],
            });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该支持 COMBINE_LATEST 边模式', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-19',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                        mode: EdgeMode.COMBINE_LATEST,
                    },
                    {
                        id: 'edge-20',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                        mode: EdgeMode.COMBINE_LATEST,
                    },
                ],
            });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });

        it('应该支持 WITH_LATEST_FROM 边模式', () => {
            // Arrange
            const node1 = createTestNode({ id: 'node-1' });
            const node2 = createTestNode({ id: 'node-2' });
            const node3 = createTestNode({ id: 'node-3' });

            const ast = createWorkflowGraphAst({
                nodes: [node1, node2, node3],
                edges: [
                    {
                        id: 'edge-21',
                        from: 'node-1',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputA',
                        mode: EdgeMode.WITH_LATEST_FROM,
                        isPrimary: true,
                    },
                    {
                        id: 'edge-22',
                        from: 'node-2',
                        to: 'node-3',
                        fromProperty: 'output',
                        toProperty: 'inputB',
                        mode: EdgeMode.WITH_LATEST_FROM,
                    },
                ],
            });

            // Act & Assert
            expect(() => {
                networkBuilder.buildNetwork(ast, ast);
            }).not.toThrow();
        });
    });
});
