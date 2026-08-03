import { describe, it, expect, beforeEach } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { Compiler } from '../src/compiler';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { setupCompiler, textNode, makeWorkflow } from './WorkflowGraphAstVisitor.helpers';

let compiler: Compiler;

beforeEach(() => {
    compiler = setupCompiler();
});

describe('WorkflowGraphAstVisitor - 边界条件测试', () => {
    describe('handler 方法边界', () => {
        it('应正确处理空输入对象', async () => {
            const n1 = textNode(compiler, 'n1', []);

            const workflow = makeWorkflow([n1], [], ['n1']);

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
            expect(events.some(e => e.type === 'node_success' && e.id === workflow.id)).toBe(true);
        });

        it('应正确处理 undefined 输入', async () => {
            const n1 = textNode(compiler, 'n1');

            const workflow = makeWorkflow([n1], [], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, undefined).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });

    describe('空节点列表边界', () => {
        it('应正确处理空工作流（无节点）', async () => {
            const workflow = makeWorkflow([], [], []);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理无入口节点的工作流', async () => {
            const n1 = textNode(compiler, 'n1');

            const workflow = makeWorkflow([n1], [], []);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 无入口节点时，节点仍应执行（使用静态值）
            expect(workflow.state).toBe('success');
        });
    });

    describe('入口节点边界', () => {
        it('应正确处理多个入口节点', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [], ['n1', 'n2']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理空 entryNodeIds（自动检测）', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
            ], []);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });
});
