import { describe, it, expect, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom, } from 'rxjs';
import { toArray, } from 'rxjs/operators';
import { NodeEvent } from '../src/execution/events';
import { ExecutionContext } from '../src/execution/ExecutionContext';

describe('Concurrent Workflow Execution', () => {
    let compiler: Compiler;

    beforeAll(() => {
        root.get(TextAreaAstVisitor);
        root.get(WorkflowGraphAstVisitor);
        compiler = root.get(Compiler);
    });

    it('ExecutionContext 隔离并发执行状态', async () => {
        // 模拟两个并发执行，使用独立的 ExecutionContext
        const ctx1 = new ExecutionContext();
        const ctx2 = new ExecutionContext();

        // 在 ctx1 中设置节点状态
        ctx1.getNodeState('workflow-1').state = 'running';
        ctx1.getNodeState('node-1').state = 'success';
        ctx1.getNodeState('node-1').count = 5;

        // 在 ctx2 中设置不同的状态
        ctx2.getNodeState('workflow-1').state = 'fail';
        ctx2.getNodeState('node-1').state = 'fail';
        ctx2.getNodeState('node-1').error = { message: 'test error' };

        // 验证状态完全隔离
        expect(ctx1.getNodeState('workflow-1').state).toBe('running');
        expect(ctx1.getNodeState('node-1').state).toBe('success');
        expect(ctx1.getNodeState('node-1').count).toBe(5);
        expect(ctx1.getNodeState('node-1').error).toBeUndefined();

        expect(ctx2.getNodeState('workflow-1').state).toBe('fail');
        expect(ctx2.getNodeState('node-1').state).toBe('fail');
        expect(ctx2.getNodeState('node-1').error?.message).toBe('test error');
    });

    it('同一 AST 实例执行时状态正确更新', async () => {
        const node = compiler.compile(new TextAreaAst());
        node.id = 'n1';
        node.input = ['test'];

        const workflow = createWorkflowGraphAst({
            nodes: [node],
            edges: [],
            entryNodeIds: ['n1']
        });

        // 执行工作流
        const events = await firstValueFrom(
            executeWorkflow(workflow, {}).pipe(toArray())
        );

        // 验证有 node_success 事件
        expect(events.some(e => e.type === 'node_success' && e.id === workflow.id)).toBe(true);
        expect(workflow.state).toBe('success');
    });

    it('快速连续执行不会导致状态覆盖', async () => {
        const node = compiler.compile(new TextAreaAst());
        node.id = 'n1';
        node.input = ['test'];

        const workflow = createWorkflowGraphAst({
            nodes: [node],
            edges: [],
            entryNodeIds: ['n1']
        });

        // 快速连续执行 5 次
        const results: NodeEvent[][] = [];
        for (let i = 0; i < 5; i++) {
            const events = await firstValueFrom(
                executeWorkflow(workflow, { iteration: i }).pipe(toArray())
            );
            results.push(events);
        }

        // 每次执行都应该成功
        results.forEach((events, _i) => {
            const hasSuccess = events.some(e => e.type === 'node_success' && e.id === workflow.id);
            expect(hasSuccess).toBe(true);
        });

        // 最终状态应该是 success
        expect(workflow.state).toBe('success');
    });

    it('不同工作流实例并发执行完全隔离', async () => {
        // 创建两个独立的工作流实例
        const createWorkflow = (id: string) => {
            const node = compiler.compile(new TextAreaAst());
            node.id = `${id}-n1`;
            node.input = [`test-${id}`];

            return createWorkflowGraphAst({
                id,
                nodes: [node],
                edges: [],
                entryNodeIds: [`${id}-n1`]
            });
        };

        const workflow1 = createWorkflow('wf1');
        const workflow2 = createWorkflow('wf2');

        // 并发执行
        const [events1, events2] = await Promise.all([
            firstValueFrom(executeWorkflow(workflow1, {}).pipe(toArray())),
            firstValueFrom(executeWorkflow(workflow2, {}).pipe(toArray()))
        ]);

        // 两个工作流都应该成功
        expect(events1.some(e => e.type === 'node_success' && e.id === 'wf1')).toBe(true);
        expect(events2.some(e => e.type === 'node_success' && e.id === 'wf2')).toBe(true);

        // 状态独立
        expect(workflow1.state).toBe('success');
        expect(workflow2.state).toBe('success');
    });
});
