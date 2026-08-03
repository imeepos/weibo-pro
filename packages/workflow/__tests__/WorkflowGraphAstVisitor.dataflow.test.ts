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
    describe('数据流边界', () => {
        it('应正确处理多次发射', async () => {
            const n1 = emitterNode(compiler, 'n1', [1, 2, 3]);

            const n2 = textNode(compiler, 'n2');

            const workflow = makeWorkflow([n1, n2], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
            ], ['n1']);

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // ArrayEmitterAst 为每个元素发射一次，MERGE 模式会让 n2 执行 3 次
            const n2Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n2');
            expect(n2Emits.length).toBeGreaterThanOrEqual(3);
            expect(workflow.state).toBe('success');
        });

        it('应正确处理有输入源节点', async () => {
            const n1 = textNode(compiler, 'n1', ['test']); // 设置输入，这样节点会执行

            const workflow = makeWorkflow([n1], [], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 有入口节点时，节点应使用系统输入执行
            expect(workflow.state).toBe('success');
        });
    });

    describe('并发和执行顺序边界', () => {
        it('应正确处理并发入口节点', async () => {
            const n1 = emitterNode(compiler, 'n1', ['a', 'b']);

            const n2 = emitterNode(compiler, 'n2', ['1', '2']);

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
            ], ['n1', 'n2']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理深度嵌套工作流', async () => {
            const n1 = textNode(compiler, 'n1');

            const n2 = textNode(compiler, 'n2');

            const n3 = textNode(compiler, 'n3');

            const workflow = makeWorkflow([n1, n2, n3], [
                { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' },
                { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input' }
            ], ['n1']);

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });
});
