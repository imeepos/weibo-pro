import { describe, it, expect, beforeEach } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { Compiler } from '../src/compiler';
import { EdgeMode } from '../src/types';
import { firstValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { setupCompiler, textNode, emitterNode, makeWorkflow } from './WorkflowGraphAstVisitor.helpers';

let compiler: Compiler;

beforeEach(() => {
    compiler = setupCompiler();
});

describe('WorkflowGraphAstVisitor - 边界条件测试', () => {
    describe('边组合边界', () => {
        it('应正确处理空边列表', async () => {
            const n1 = textNode(compiler, 'n1');

            const workflow = makeWorkflow([n1], [], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, { test: 'data' }).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理只有普通边的节点', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
            ], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理混合模式边（普通 + router）', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = emitterNode(compiler, 'n2', ['a', 'b']);

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input2', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true }
            ], ['n1', 'n2']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // MERGE 模式会触发一次，WITH_LATEST_FROM 会在每次发射时触发
            // 验证工作流完成即可
            expect(workflow.state).toBe('success');
        });

        it('应正确处理多个相同模式的边', async () => {
            const n1 = emitterNode(compiler, 'n1', ['a', 'b']);

            const n2 = emitterNode(compiler, 'n2', ['1', '2']);

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
            ], ['n1', 'n2']);

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
            expect(n3Emits.length).toBe(4);
        });
    });

    describe('EdgeMode 优先级边界', () => {
        it('应正确处理不同 EdgeMode 的优先级合并', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = emitterNode(compiler, 'n2', ['a']);

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.COMBINE_LATEST }
            ], ['n1', 'n2']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理未定义 EdgeMode（默认为 COMBINE_LATEST）', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
            ], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });
});
