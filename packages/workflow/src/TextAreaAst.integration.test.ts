import { describe, it, expect, beforeAll } from 'vitest';
import { TextAreaAst } from './TextAreaAst';
import { WorkflowGraphAst } from './ast';
import { ReactiveScheduler } from './execution/reactive-scheduler';
import { root, Injectable } from '@sker/core';
import { Compiler } from './compiler';
import { firstValueFrom, Observable } from 'rxjs';
import { Handler } from './decorator';

/**
 * 集成测试：复现用户反馈的序列化问题
 *
 * 场景：
 * 1. 从旧数据加载工作流，其中聚合节点的 input 是空字符串 ""
 * 2. 执行工作流，节点1和节点3输出到节点2（IS_MULTI 聚合）
 * 3. 验证执行后节点2的 input 在序列化中显示为数组而非空字符串
 *
 * 预期：节点2.input 应该是 ["01", "02"] 而非 ""
 */
describe('TextAreaAst 集成测试 - 旧数据序列化问题', () => {
    // 注册一个简单的 handler 来模拟 TextAreaAstVisitor
    beforeAll(() => {
        @Injectable()
        class MockTextAreaVisitor {
            @Handler(TextAreaAst)
            handler(ast: TextAreaAst, ctx: any) {
                return new Observable(obs => {
                    ast.state = 'running';
                    obs.next({ ...ast });

                    // 模拟 TextAreaAstVisitor 的逻辑
                    const outputValue = Array.isArray(ast.input)
                        ? ast.input.join('\n')
                        : ast.input;
                    ast.output.next(outputValue);

                    ast.state = 'success';
                    obs.next({ ...ast });
                    obs.complete();
                });
            }
        }

        // 确保 visitor 被注册
        root.get(MockTextAreaVisitor);
    });

    it('应该将旧数据（input为空字符串）的聚合节点正确序列化为数组', async () => {
        const compiler = root.get(Compiler);
        const scheduler = root.get(ReactiveScheduler);

        // 模拟从旧数据加载的节点（input 是空字符串）
        const node1 = new TextAreaAst();
        node1.id = 'node1';
        node1.input = ['01'];  // 开始节点有静态输入

        const node3 = new TextAreaAst();
        node3.id = 'node3';
        node3.input = ['02'];  // 开始节点有静态输入

        // 关键：节点2的 input 是旧数据格式（空字符串）
        const node2 = new TextAreaAst();
        node2.id = 'node2';
        node2.input = '';  // ❌ 旧数据格式：空字符串

        // 编译节点
        compiler.compile(node1);
        compiler.compile(node2);
        compiler.compile(node3);

        // 创建工作流
        const workflow = new WorkflowGraphAst();
        workflow.id = 'test-workflow';
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

        // 验证工作流执行成功
        expect(result.state).toBe('success');

        // 找到节点2
        const finalNode2 = result.nodes.find(n => n.id === 'node2');
        expect(finalNode2).toBeDefined();
        expect(finalNode2!.state).toBe('success');

        // 关键验证：节点2的 input 应该是数组，而非空字符串
        console.log('[测试] 节点2的 input:', finalNode2!.input);
        console.log('[测试] 节点2的 input 类型:', typeof finalNode2!.input);
        console.log('[测试] 节点2的 input 是否为数组:', Array.isArray(finalNode2!.input));

        // ⚠️ 这个断言预期会失败，因为还没有修复
        expect(Array.isArray(finalNode2!.input)).toBe(true);
        expect(finalNode2!.input).toEqual(['01', '02']);

        // 验证输出正确（这个应该通过）
        expect((finalNode2 as any).output._value).toBe('01\n02');
    }, 10000);  // 增加超时时间

    it('模拟用户提供的 JSON 数据场景', async () => {
        const compiler = root.get(Compiler);
        const scheduler = root.get(ReactiveScheduler);

        // 直接从用户提供的 JSON 创建节点（模拟反序列化）
        const node1Data = {
            id: "27430bc4-6aac-487e-96ac-2ac63bb835f9",
            type: "TextAreaAst",
            input: "01",  // 静态输入
            state: "pending" as const
        };

        const node3Data = {
            id: "9fdc563c-32ad-481c-b2c7-e5d6faeee82d",
            type: "TextAreaAst",
            input: "02",  // 静态输入
            state: "pending" as const
        };

        const node2Data = {
            id: "07731c31-75e8-4c32-9d9c-0510129b6076",
            type: "TextAreaAst",
            input: "",  // ❌ 旧数据：空字符串
            state: "pending" as const
        };

        // 从 JSON 数据创建节点实例
        const node1 = Object.assign(new TextAreaAst(), node1Data);
        const node2 = Object.assign(new TextAreaAst(), node2Data);
        const node3 = Object.assign(new TextAreaAst(), node3Data);

        // 编译
        compiler.compile(node1);
        compiler.compile(node2);
        compiler.compile(node3);

        // 创建工作流（使用用户提供的边配置）
        const workflow = new WorkflowGraphAst();
        workflow.id = "570eb85d-fe0a-4391-8d92-06b062bd4de4";
        workflow.name = "demo-02";
        workflow.nodes = [node1, node3, node2];
        workflow.edges = [
            {
                id: "edge-8b10d9f3-ffb8-4268-b272-a45b89459c00",
                to: "07731c31-75e8-4c32-9d9c-0510129b6076",
                from: "27430bc4-6aac-487e-96ac-2ac63bb835f9",
                type: "data",
                toProperty: "input",
                fromProperty: "output"
            },
            {
                id: "edge-68e93a1b-2936-4e74-be69-8a9c27faca04",
                to: "07731c31-75e8-4c32-9d9c-0510129b6076",
                from: "9fdc563c-32ad-481c-b2c7-e5d6faeee82d",
                type: "data",
                toProperty: "input",
                fromProperty: "output"
            }
        ];

        workflow.entryNodeIds = [
            "27430bc4-6aac-487e-96ac-2ac63bb835f9",
            "9fdc563c-32ad-481c-b2c7-e5d6faeee82d"
        ];

        workflow.endNodeIds = [
            "07731c31-75e8-4c32-9d9c-0510129b6076"
        ];

        compiler.compile(workflow);

        // 执行工作流
        const result = await firstValueFrom(scheduler.schedule(workflow, workflow));

        // 验证
        expect(result.state).toBe('success');

        const finalNode2 = result.nodes.find(n => n.id === "07731c31-75e8-4c32-9d9c-0510129b6076");

        console.log('[用户场景测试] 节点2的 input:', finalNode2!.input);
        console.log('[用户场景测试] 节点2的 output._value:', (finalNode2 as any).output._value);

        // 序列化测试：模拟前端接收到的 JSON
        const serialized = JSON.parse(JSON.stringify(finalNode2));
        console.log('[用户场景测试] 序列化后的 input:', serialized.input);
        console.log('[用户场景测试] 序列化后的 input 类型:', typeof serialized.input);

        // ⚠️ 关键断言：序列化后 input 应该是数组
        expect(Array.isArray(serialized.input)).toBe(true);
        expect(serialized.input).toEqual(['01', '02']);
    }, 10000);
});
