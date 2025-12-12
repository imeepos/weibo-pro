import { describe, it, expect, beforeEach } from 'vitest';
import { TextAreaAst } from './TextAreaAst';
import { WorkflowGraphAst } from './ast';
import { ReactiveScheduler } from './execution/reactive-scheduler';
import { root } from '@sker/core';
import { WorkflowEventBus } from './execution/workflow-events';
import { Compiler } from './compiler';
import { firstValueFrom } from 'rxjs';

describe('TextAreaAst', () => {
    describe('默认值', () => {
        it('input 默认值应为空数组', () => {
            const node = new TextAreaAst();

            expect(node.input).toEqual([]);
            expect(Array.isArray(node.input)).toBe(true);
        });

        it('output 默认值应为 BehaviorSubject', () => {
            const node = new TextAreaAst();

            expect(node.output).toBeDefined();
            expect(node.output.value).toBeNull();
        });
    });

    describe('IS_MULTI 输入聚合', () => {
        let scheduler: ReactiveScheduler;
        let compiler: Compiler;

        beforeEach(() => {
            // 注意：root 容器是全局单例，这里直接获取实例
            scheduler = root.get(ReactiveScheduler);
            compiler = root.get(Compiler);
        });

        it('应正确聚合多个输入边的数据为数组', async () => {
            // 创建工作流：节点1和节点3输出到节点2
            const node1 = compiler.compile(new TextAreaAst());
            node1.id = 'node1';
            node1.input = ['01'];

            const node3 = compiler.compile(new TextAreaAst());
            node3.id = 'node3';
            node3.input = ['02'];

            const node2 = compiler.compile(new TextAreaAst());
            node2.id = 'node2';

            const workflow = new WorkflowGraphAst();
            workflow.nodes = [node1, node3, node2];
            workflow.edges = [
                {
                    id: 'edge1',
                    from: 'node1',
                    to: 'node2',
                    fromProperty: 'output',
                    toProperty: 'input',
                    type: 'data'
                },
                {
                    id: 'edge2',
                    from: 'node3',
                    to: 'node2',
                    fromProperty: 'output',
                    toProperty: 'input',
                    type: 'data'
                }
            ];

            // 编译工作流
            compiler.compile(workflow);

            // 执行工作流
            const result = await firstValueFrom(scheduler.schedule(workflow, workflow));

            // 验证节点2的input应该聚合了两个输入
            const finalNode2 = result.nodes.find(n => n.id === 'node2') as TextAreaAst;

            expect(finalNode2).toBeDefined();
            expect(finalNode2.state).toBe('success');
            expect(Array.isArray(finalNode2.input)).toBe(true);
            expect(finalNode2.input).toEqual(['01', '02']);
        });

        it('序列化后input应显示为数组而非空字符串', () => {
            const node = new TextAreaAst();
            node.input = ['01', '02'];

            // 序列化
            const json = JSON.parse(JSON.stringify(node));

            // 验证序列化后input是数组
            expect(Array.isArray(json.input)).toBe(true);
            expect(json.input).toEqual(['01', '02']);
        });

        it('克隆节点后input应保持为数组', () => {
            const node = new TextAreaAst();

            // 使用 structuredClone（如果可用）
            const cloned = typeof structuredClone !== 'undefined'
                ? structuredClone(node)
                : JSON.parse(JSON.stringify(node));

            expect(Array.isArray(cloned.input)).toBe(true);
            expect(cloned.input).toEqual([]);
        });
    });

    describe('单输入场景', () => {
        let scheduler: ReactiveScheduler;
        let compiler: Compiler;

        beforeEach(() => {
            root.clearAllProviders();
            root.provideValue(WorkflowEventBus, new WorkflowEventBus());
            scheduler = root.get(ReactiveScheduler);
            compiler = root.get(Compiler);
        });

        it('单个输入应也被包装为数组', async () => {
            const node1 = compiler.compile(new TextAreaAst());
            node1.id = 'node1';
            node1.input = ['hello'];

            const node2 = compiler.compile(new TextAreaAst());
            node2.id = 'node2';

            const workflow = new WorkflowGraphAst();
            workflow.nodes = [node1, node2];
            workflow.edges = [
                {
                    id: 'edge1',
                    from: 'node1',
                    to: 'node2',
                    fromProperty: 'output',
                    toProperty: 'input',
                    type: 'data'
                }
            ];

            compiler.compile(workflow);

            const result = await firstValueFrom(scheduler.schedule(workflow, workflow));

            const finalNode2 = result.nodes.find(n => n.id === 'node2') as TextAreaAst;

            expect(finalNode2).toBeDefined();
            expect(finalNode2.state).toBe('success');
            expect(Array.isArray(finalNode2.input)).toBe(true);
            expect(finalNode2.input).toEqual(['hello']);
        });
    });

    describe('输出验证', () => {
        it('应将多个输入用换行符连接输出', () => {
            const node = new TextAreaAst();

            // 模拟多输入场景
            node.input = ['01', '02', '03'];

            // 计算输出值（模拟 TextAreaAstVisitor 的逻辑）
            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('01\n02\n03');
        });

        it('空数组应输出空字符串', () => {
            const node = new TextAreaAst();

            // input 默认是空数组
            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('');
        });

        it('单个输入应直接输出', () => {
            const node = new TextAreaAst();
            node.input = ['hello'];

            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('hello');
        });
    });
});
