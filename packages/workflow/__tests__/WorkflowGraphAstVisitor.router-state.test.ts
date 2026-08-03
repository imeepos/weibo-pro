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
    describe('Router 边边界', () => {
        it('应正确处理 WITH_LATEST_FROM 模式', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true }
            ], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理 router 边携带其他边的值', async () => {
            const n1 = emitterNode(compiler, 'n1', ['a', 'b']);

            const n2 = textNode(compiler, 'n2');

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input1', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input2', mode: EdgeMode.COMBINE_LATEST }
            ], ['n1', 'n2']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 验证工作流成功完成
            expect(workflow.state).toBe('success');
        });
    });

    describe('状态转换边界', () => {
        it('应正确处理 pending -> running -> success 转换', async () => {
            const n1 = textNode(compiler, 'n1');

            const workflow = makeWorkflow([n1], [], ['n1']);

            expect(workflow.state).toBe('pending');

            await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应在工作流失败时清空错误状态', async () => {
            const n1 = textNode(compiler, 'n1');

            const workflow = makeWorkflow([n1], [], ['n1']);

            // 先设置错误状态
            workflow.error = new Error('Previous error');
            workflow.state = 'fail';

            // 再次执行应重置状态为 pending，然后变为 success
            expect(workflow.state).toBe('fail');

            await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 执行完成后状态应为 success，错误应被清除
            expect(workflow.state).toBe('success');
        });
    });

    describe('循环和反馈边界', () => {
        it('应正确处理简单线性流程', async () => {
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
