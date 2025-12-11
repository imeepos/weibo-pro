import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { NodeExecutor } from './node-executor';
import { VisitorExecutor } from './visitor-executor';
import { createWorkflowGraphAst } from '../ast';
import { INode, IAstStates } from '../types';

/**
 * 创建测试用的节点
 */
function createTestNode(overrides?: Partial<INode>): INode {
    return {
        id: 'test-node',
        type: 'test',
        state: 'pending' as IAstStates,
        count: 0,
        emitCount: 0,
        position: { x: 0, y: 0 },
        error: undefined,
        ...overrides,
    };
}

describe('NodeExecutor', () => {
    let nodeExecutor: NodeExecutor;
    let visitorExecutor: VisitorExecutor;

    beforeEach(() => {
        visitorExecutor = {
            visit: vi.fn(),
        } as any;

        nodeExecutor = new NodeExecutor(visitorExecutor);
    });

    it('应该执行节点并更新计数', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-1' });
        const executedNode = { ...node, state: 'success' as IAstStates };
        vi.mocked(visitorExecutor.visit).mockReturnValue(of(executedNode));

        const ast = createWorkflowGraphAst({ nodes: [node] });

        // Act
        const result = await firstValueFrom(nodeExecutor.execute(node, ast));

        // Assert
        expect(result.emitCount).toBe(1);
        expect(result.state).toBe('success');
    });

    it('应该在执行前设置节点为 running 状态', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-2' });
        let capturedNode: INode | null = null;

        vi.mocked(visitorExecutor.visit).mockImplementation((nodeArg) => {
            capturedNode = nodeArg;
            return of({ ...nodeArg, state: 'success' as IAstStates });
        });

        const ast = createWorkflowGraphAst({ nodes: [node] });

        // Act
        await firstValueFrom(nodeExecutor.execute(node, ast));

        // Assert
        expect(capturedNode).not.toBeNull();
        expect(capturedNode!.state).toBe('running');
    });

    it('应该增加节点的执行计数', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-3', count: 5 });
        let capturedNode: INode | null = null;

        vi.mocked(visitorExecutor.visit).mockImplementation((nodeArg) => {
            capturedNode = nodeArg;
            return of({ ...nodeArg, state: 'success' as IAstStates });
        });

        const ast = createWorkflowGraphAst({ nodes: [node] });

        // Act
        await firstValueFrom(nodeExecutor.execute(node, ast));

        // Assert
        expect(capturedNode).not.toBeNull();
        expect(capturedNode!.count).toBe(6);
    });

    it('应该在多次发射时更新发射计数', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-4', emitCount: 3 });
        const result1 = { ...node, state: 'running' as IAstStates };
        const result2 = { ...node, state: 'success' as IAstStates };

        vi.mocked(visitorExecutor.visit).mockReturnValue(of(result1, result2));

        const ast = createWorkflowGraphAst({ nodes: [node] });

        // Act
        const emissions: INode[] = [];
        const observable = nodeExecutor.execute(node, ast);

        await new Promise<void>(resolve => {
            observable.subscribe({
                next: (result) => emissions.push({ ...result }),
                complete: () => resolve(),
            });
        });

        // Assert
        expect(emissions).toHaveLength(2);
        expect(emissions[0]!.emitCount).toBe(4);
        expect(emissions[1]!.emitCount).toBe(4);
    });

    it('应该正确处理错误节点', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-5' });
        const failedNode = {
            ...node,
            state: 'fail' as IAstStates,
            error: { message: 'Test error' } as any,
        };

        vi.mocked(visitorExecutor.visit).mockReturnValue(of(failedNode));

        const ast = createWorkflowGraphAst({ nodes: [node] });

        // Act
        const result = await firstValueFrom(nodeExecutor.execute(node, ast));

        // Assert
        expect(result.state).toBe('fail');
        expect(result.error).toBeDefined();
        expect(result.emitCount).toBe(1);
    });

    it('应该使用提供的 ctx 作为执行上下文', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-6' });
        const ast = createWorkflowGraphAst({ nodes: [node] });
        const customCtx = createWorkflowGraphAst({ name: 'Custom Context' });

        let visitedCtx: any = null;

        vi.mocked(visitorExecutor.visit).mockImplementation((_, ctx) => {
            visitedCtx = ctx;
            return of({ ...node, state: 'success' as IAstStates });
        });

        // Act
        await firstValueFrom(nodeExecutor.execute(node, ast, customCtx));

        // Assert
        expect(visitedCtx).toBe(customCtx);
    });

    it('如果 ctx 未提供，应该默认使用 ast', async () => {
        // Arrange
        const node = createTestNode({ id: 'node-7' });
        const ast = createWorkflowGraphAst({ nodes: [node] });

        let visitedCtx: any = null;

        vi.mocked(visitorExecutor.visit).mockImplementation((_, ctx) => {
            visitedCtx = ctx;
            return of({ ...node, state: 'success' as IAstStates });
        });

        // Act
        await firstValueFrom(nodeExecutor.execute(node, ast));

        // Assert
        expect(visitedCtx).toBe(ast);
    });

    it('不应该修改原始节点对象', async () => {
        // Arrange
        const originalNode = createTestNode({ id: 'node-8' });
        const originalCount = originalNode.count;
        const originalState = originalNode.state;

        vi.mocked(visitorExecutor.visit).mockReturnValue(
            of({ ...originalNode, state: 'success' as IAstStates })
        );

        const ast = createWorkflowGraphAst({ nodes: [originalNode] });

        // Act
        await firstValueFrom(nodeExecutor.execute(originalNode, ast));

        // Assert
        expect(originalNode.count).toBe(originalCount);
        expect(originalNode.state).toBe(originalState);
    });
});
