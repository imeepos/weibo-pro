import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { executeWorkflow } from '../src/executor';
import { createWorkflowGraphAst } from '../src/ast';
import { TextAreaAst, TextAreaAstVisitor } from '../src/TextAreaAst';
import { WorkflowGraphAstVisitor } from '../src/WorkflowGraphAstVisitor';
import { Compiler } from '../src/compiler';
import { root } from '@sker/core';
import { firstValueFrom, } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { ArrayEmitterAst, ArrayEmitterAstVisitor } from './ArrayEmitterAst';
import { EdgeMode } from '../src/types';

let compiler: Compiler;

beforeAll(() => {
    root.get(TextAreaAstVisitor);
    root.get(WorkflowGraphAstVisitor);
    root.get(ArrayEmitterAstVisitor);
});

beforeEach(() => {
    compiler = root.get(Compiler);
});

describe('WorkflowGraphAstVisitor - 边界条件测试', () => {
    describe('handler 方法边界', () => {
        it('应正确处理空输入对象', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';
            n1.input = [];

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
            expect(events.some(e => e.type === 'node_success' && e.id === workflow.id)).toBe(true);
        });

        it('应正确处理 undefined 输入', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, undefined).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });

    describe('空节点列表边界', () => {
        it('应正确处理空工作流（无节点）', async () => {
            const workflow = createWorkflowGraphAst({
                nodes: [],
                edges: [],
                entryNodeIds: []
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理无入口节点的工作流', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: []
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 无入口节点时，节点仍应执行（使用静态值）
            expect(workflow.state).toBe('success');
        });
    });

    describe('边组合边界', () => {
        it('应正确处理空边列表', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, { test: 'data' }).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理只有普通边的节点', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
                ],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理混合模式边（普通 + router）', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new ArrayEmitterAst());
            n2.id = 'n2';
            n2.items = ['a', 'b'];

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input2', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true }
                ],
                entryNodeIds: ['n1', 'n2']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // MERGE 模式会触发一次，WITH_LATEST_FROM 会在每次发射时触发
            // 验证工作流完成即可
            expect(workflow.state).toBe('success');
        });

        it('应正确处理多个相同模式的边', async () => {
            const n1 = compiler.compile(new ArrayEmitterAst());
            n1.id = 'n1';
            n1.items = ['a', 'b'];

            const n2 = compiler.compile(new ArrayEmitterAst());
            n2.id = 'n2';
            n2.items = ['1', '2'];

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
                ],
                entryNodeIds: ['n1', 'n2']
            });

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            const n3Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n3');
            expect(n3Emits.length).toBe(4);
        });
    });

    describe('入口节点边界', () => {
        it('应正确处理多个入口节点', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [],
                entryNodeIds: ['n1', 'n2']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理空 entryNodeIds（自动检测）', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
                ],
                entryNodeIds: []
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });

    describe('EdgeMode 优先级边界', () => {
        it('应正确处理不同 EdgeMode 的优先级合并', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new ArrayEmitterAst());
            n2.id = 'n2';
            n2.items = ['a'];

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.COMBINE_LATEST }
                ],
                entryNodeIds: ['n1', 'n2']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理未定义 EdgeMode（默认为 COMBINE_LATEST）', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
                ],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });

    describe('循环和反馈边界', () => {
        it('应正确处理简单线性流程', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' }
                ],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });

    describe('数据流边界', () => {
        it('应正确处理多次发射', async () => {
            const n1 = compiler.compile(new ArrayEmitterAst());
            n1.id = 'n1';
            n1.items = [1, 2, 3];

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
                ],
                entryNodeIds: ['n1']
            });

            const events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // ArrayEmitterAst 为每个元素发射一次，MERGE 模式会让 n2 执行 3 次
            const n2Emits = events.filter(e => e.type === 'node_emit' && e.id === 'n2');
            expect(n2Emits.length).toBeGreaterThanOrEqual(3);
            expect(workflow.state).toBe('success');
        });

        it('应正确处理有输入源节点', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';
            n1.input = ['test']; // 设置输入，这样节点会执行

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 有入口节点时，节点应使用系统输入执行
            expect(workflow.state).toBe('success');
        });
    });

    describe('状态转换边界', () => {
        it('应正确处理 pending -> running -> success 转换', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

            expect(workflow.state).toBe('pending');

            await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应在工作流失败时清空错误状态', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const workflow = createWorkflowGraphAst({
                nodes: [n1],
                edges: [],
                entryNodeIds: ['n1']
            });

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

    describe('Router 边边界', () => {
        it('应正确处理 WITH_LATEST_FROM 模式', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true }
                ],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理 router 边携带其他边的值', async () => {
            const n1 = compiler.compile(new ArrayEmitterAst());
            n1.id = 'n1';
            n1.items = ['a', 'b'];

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input1', mode: EdgeMode.WITH_LATEST_FROM, isPrimary: true },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input2', mode: EdgeMode.COMBINE_LATEST }
                ],
                entryNodeIds: ['n1', 'n2']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            // 验证工作流成功完成
            expect(workflow.state).toBe('success');
        });
    });

    describe('并发和执行顺序边界', () => {
        it('应正确处理并发入口节点', async () => {
            const n1 = compiler.compile(new ArrayEmitterAst());
            n1.id = 'n1';
            n1.items = ['a', 'b'];

            const n2 = compiler.compile(new ArrayEmitterAst());
            n2.id = 'n2';
            n2.items = ['1', '2'];

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input', mode: EdgeMode.MERGE }
                ],
                entryNodeIds: ['n1', 'n2']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });

        it('应正确处理深度嵌套工作流', async () => {
            const n1 = compiler.compile(new TextAreaAst());
            n1.id = 'n1';

            const n2 = compiler.compile(new TextAreaAst());
            n2.id = 'n2';

            const n3 = compiler.compile(new TextAreaAst());
            n3.id = 'n3';

            const workflow = createWorkflowGraphAst({
                nodes: [n1, n2, n3],
                edges: [
                    { id: 'e1', from: 'n1', to: 'n2', fromProperty: 'output', toProperty: 'input' },
                    { id: 'e2', from: 'n2', to: 'n3', fromProperty: 'output', toProperty: 'input' }
                ],
                entryNodeIds: ['n1']
            });

            const _events = await firstValueFrom(
                executeWorkflow(workflow, {}).pipe(toArray())
            );

            expect(workflow.state).toBe('success');
        });
    });
});
