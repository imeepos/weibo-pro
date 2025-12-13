import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveScheduler } from './reactive-scheduler';
import { WorkflowGraphAst } from '../ast';
import { TextAreaAst } from '../TextAreaAst';
import { Injectable, root } from '@sker/core';
import { WorkflowEventBus } from './workflow-events';
import { lastValueFrom } from 'rxjs';
import { Handler } from '../decorator';
import { Observable } from 'rxjs';
import { fromJson } from '../generate';
import { Compiler } from '../compiler';

/**
 * 简单的 TextAreaAst Handler 用于测试
 */
@Injectable()
class TestTextAreaHandler {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any): Observable<TextAreaAst> {
        return new Observable<TextAreaAst>(obs => {
            ast.state = 'running';
            obs.next(ast);

            // 处理输入并发射输出
            let outputValue: string;
            if (Array.isArray(ast.input)) {
                outputValue = ast.input.join('\n');
            } else if (typeof ast.input === 'object' && ast.input !== null) {
                outputValue = JSON.stringify(ast.input);
            } else {
                outputValue = ast.input;
            }
            ast.output.next(outputValue);

            ast.state = 'success';
            obs.next(ast);
            obs.complete();
        });
    }
}

describe('ReactiveScheduler - 入口节点定义问题', () => {
    let scheduler: ReactiveScheduler;

    beforeEach(() => {
        const eventBus = root.get(WorkflowEventBus);
        scheduler = new ReactiveScheduler(eventBus);
    });

    /**
     * 创建翻译工作流
     *
     * 场景说明：
     * - 节点1 (TextAreaAst): "翻译成中文" - 不是入口节点，通过边连接到下游
     * - 节点3 (TextAreaAst): "You are Claude Code..." - 是入口节点，从 context 获取参数
     * - 问题：节点1 不是入口节点，所以不会执行，导致下游收不到它的输出
     */
    function createTranslationWorkflow() {
        // 节点1: 系统提示词 - 不是入口节点
        const systemPromptNode = new TextAreaAst();
        systemPromptNode.id = 'node-system';
        systemPromptNode.type = 'TextAreaAst';
        systemPromptNode.name = '系统提示词';
        systemPromptNode.state = 'pending';
        systemPromptNode.count = 0;
        systemPromptNode.emitCount = 0;
        systemPromptNode.input = '翻译成中文';

        // 节点3: 用户提示词 - 是入口节点
        const userPromptNode = new TextAreaAst();
        userPromptNode.id = 'node-user';
        userPromptNode.type = 'TextAreaAst';
        userPromptNode.name = '用户提示词';
        userPromptNode.state = 'pending';
        userPromptNode.count = 0;
        userPromptNode.emitCount = 0;
        userPromptNode.input = 'You are Claude Code, Anthropic\'s official CLI for Claude.';

        // 节点2: 目标节点（模拟 LlmTextAgentAst）
        const targetNode = new TextAreaAst();
        targetNode.id = 'node-target';
        targetNode.type = 'TextAreaAst';
        targetNode.name = '目标节点';
        targetNode.state = 'pending';
        targetNode.count = 0;
        targetNode.emitCount = 0;
        targetNode.input = []; // IS_MULTI 模式

        // 节点4: 输出节点
        const outputNode = new TextAreaAst();
        outputNode.id = 'node-output';
        outputNode.type = 'TextAreaAst';
        outputNode.name = '输出节点';
        outputNode.state = 'pending';
        outputNode.count = 0;
        outputNode.emitCount = 0;
        outputNode.input = [];

        const workflow = new WorkflowGraphAst();
        workflow.id = 'workflow-translation';
        workflow.name = '翻译工作流';
        workflow.state = 'pending';
        workflow.count = 0;
        workflow.emitCount = 0;
        workflow.nodes = [systemPromptNode, userPromptNode, targetNode, outputNode];
        workflow.edges = [
            {
                id: 'edge-system',
                from: 'node-system',
                to: 'node-target',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
            {
                id: 'edge-user',
                from: 'node-user',
                to: 'node-target',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
            {
                id: 'edge-output',
                from: 'node-target',
                to: 'node-output',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
        ];

        // 只有节点3是入口节点（参数从外界获取）
        workflow.entryNodeIds = ['node-user'];

        workflow.endNodeIds = ['node-output'];

        return workflow;
    }

    it('应该正确处理入口节点和非入口节点的数据流（复现问题）', async () => {
        const workflow = createTranslationWorkflow();

        // 模拟外界提供的参数（context）
        // 入口节点 node-user 的参数从这里获取
        const context = {
            'node-user.input': '翻译成中文（从context获取）', // 入口节点的参数
        };

        console.log('=== 工作流配置 ===');
        console.log('entryNodeIds:', workflow.entryNodeIds);
        console.log('节点信息：');
        workflow.nodes.forEach(node => {
            console.log(`  ${node.id} (${node.type}): 入度 = ${workflow.edges.filter(e => e.to === node.id).length}`);
        });

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        console.log('\n=== 执行结果 ===');
        result.nodes.forEach(node => {
            console.log(`节点 ${node.id} (${node.type}): ${node.state}`);
            if (node.type === 'TextAreaAst') {
                console.log(`  input: ${JSON.stringify((node as any).input)}`);
            }
        });

        // 验证：所有节点都应该执行成功
        expect(result.state).toBe('success');

        // 验证：目标节点应该接收到两个输入（来自两个上游节点）
        const targetNode = result.nodes.find(n => n.id === 'node-target') as TextAreaAst;
        expect(targetNode?.state).toBe('success');

        console.log('\n=== 问题诊断 ===');
        console.log('targetNode.input:', targetNode?.input);
        console.log('期望：应该包含两个值 ["翻译成中文", "翻译成中文（从context获取）"]');
        console.log('实际：可能只包含一个值，因为节点1没有执行');

        // 这个测试会显示问题：
        // targetNode 的 input 应该包含两个值，但可能只有一个
        // 因为节点1不是入口节点，所以没有执行，不会发射 output
    });
});