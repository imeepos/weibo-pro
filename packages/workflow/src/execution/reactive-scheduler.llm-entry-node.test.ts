import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveScheduler } from './reactive-scheduler';
import { WorkflowGraphAst } from '../ast';
import { TextAreaAst } from '../TextAreaAst';
import { Injectable, root } from '@sker/core';
import { WorkflowEventBus } from './workflow-events';
import { lastValueFrom } from 'rxjs';
import { Handler } from '../decorator';
import { Observable } from 'rxjs';

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

/**
 * 测试场景：翻译工作流
 *
 * 问题描述：
 * 1. 系统提示词丢失（system 属性是空数组，应该使用连接的节点值）
 * 2. LlmTextAgentAst 节点未执行（状态保持为 pending）
 *
 * 工作流结构：
 * ```
 * [节点1: TextAreaAst "翻译成中文"] ───> [LlmTextAgentAst] ───> [节点4: TextAreaAst 输出]
 *                                           ↑
 * [节点3: TextAreaAst "You are..."] ───────┘
 * ```
 *
 * entryNodeIds 只包含节点3，导致节点1未执行
 */
describe('ReactiveScheduler - LLM 入口节点问题', () => {
    let scheduler: ReactiveScheduler;

    beforeEach(() => {
        const eventBus = root.get(WorkflowEventBus);
        scheduler = new ReactiveScheduler(eventBus);
    });

    /**
     * 创建测试工作流
     *
     * 为了简化测试，我们使用 TextAreaAst 模拟 LlmTextAgentAst
     * 核心问题是相同的：多输入节点，但只有部分上游节点在 entryNodeIds 中
     */
    function createTranslationWorkflow() {
        // 节点1: 系统提示词 "翻译成中文"
        const systemPromptNode = new TextAreaAst();
        systemPromptNode.id = 'node-system';
        systemPromptNode.type = 'TextAreaAst';
        systemPromptNode.name = '系统提示词';
        systemPromptNode.state = 'pending';
        systemPromptNode.count = 0;
        systemPromptNode.emitCount = 0;
        systemPromptNode.input = '翻译成中文';

        // 节点3: 用户提示词 "You are Claude Code..."
        const userPromptNode = new TextAreaAst();
        userPromptNode.id = 'node-user';
        userPromptNode.type = 'TextAreaAst';
        userPromptNode.name = '用户提示词';
        userPromptNode.state = 'pending';
        userPromptNode.count = 0;
        userPromptNode.emitCount = 0;
        userPromptNode.input = 'You are Claude Code, Anthropic\'s official CLI for Claude.';

        // 节点2: LLM 节点（使用 TextAreaAst 模拟，因为 LlmTextAgentAst 需要真实的 LLM 调用）
        const llmNode = new TextAreaAst();
        llmNode.id = 'node-llm';
        llmNode.type = 'TextAreaAst';
        llmNode.name = 'LLM节点';
        llmNode.state = 'pending';
        llmNode.count = 0;
        llmNode.emitCount = 0;
        llmNode.input = []; // IS_MULTI 模式，初始为空数组

        // 节点4: 输出节点
        const outputNode = new TextAreaAst();
        outputNode.id = 'node-output';
        outputNode.type = 'TextAreaAst';
        outputNode.name = '输出节点';
        outputNode.state = 'pending';
        outputNode.count = 0;
        outputNode.emitCount = 0;
        outputNode.input = [];

        // 创建工作流
        const workflow = new WorkflowGraphAst();
        workflow.id = 'workflow-translation';
        workflow.name = '翻译工作流';
        workflow.state = 'pending';
        workflow.count = 0;
        workflow.emitCount = 0;
        workflow.nodes = [systemPromptNode, userPromptNode, llmNode, outputNode];

        // 定义边
        workflow.edges = [
            {
                id: 'edge-1',
                from: 'node-system',
                to: 'node-llm',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
            {
                id: 'edge-2',
                from: 'node-user',
                to: 'node-llm',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
            {
                id: 'edge-3',
                from: 'node-llm',
                to: 'node-output',
                type: 'data',
                fromProperty: 'output',
                toProperty: 'input',
            },
        ];

        // 【问题关键】entryNodeIds 只包含用户提示词节点，缺少系统提示词节点
        workflow.entryNodeIds = ['node-user'];

        workflow.endNodeIds = ['node-output'];

        return workflow;
    }

    it('应该识别所有入口节点，即使 entryNodeIds 不完整', async () => {
        const workflow = createTranslationWorkflow();

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        // 验证：所有节点都应该执行成功
        expect(result.state).toBe('success');
        expect(result.nodes.every(n => n.state === 'success')).toBe(true);

        // 验证：系统提示词节点应该被执行
        const systemNode = result.nodes.find(n => n.id === 'node-system');
        expect(systemNode?.state).toBe('success');
        expect(systemNode?.count).toBeGreaterThan(0);

        // 验证：用户提示词节点应该被执行
        const userNode = result.nodes.find(n => n.id === 'node-user');
        expect(userNode?.state).toBe('success');
        expect(userNode?.count).toBeGreaterThan(0);

        // 验证：LLM 节点应该被执行，并且接收到两个输入
        const llmNode = result.nodes.find(n => n.id === 'node-llm') as TextAreaAst;
        expect(llmNode?.state).toBe('success');
        expect(llmNode?.count).toBeGreaterThan(0);
        expect(Array.isArray(llmNode?.input)).toBe(true);
        expect((llmNode?.input as string[]).length).toBe(2);
        expect((llmNode?.input as string[])).toContain('翻译成中文');
        expect((llmNode?.input as string[])).toContain('You are Claude Code, Anthropic\'s official CLI for Claude.');

        // 验证：输出节点应该被执行
        const outputNode = result.nodes.find(n => n.id === 'node-output');
        expect(outputNode?.state).toBe('success');
        expect(outputNode?.count).toBeGreaterThan(0);
    });

    it('应该处理空的 entryNodeIds', async () => {
        const workflow = createTranslationWorkflow();
        workflow.entryNodeIds = []; // 空数组

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        // 验证：应该自动识别所有没有入边的节点作为入口节点
        expect(result.state).toBe('success');
        expect(result.nodes.every(n => n.state === 'success')).toBe(true);
    });

    it('应该处理未定义的 entryNodeIds', async () => {
        const workflow = createTranslationWorkflow();
        workflow.entryNodeIds = undefined as any; // 未定义

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        // 验证：应该自动识别所有没有入边的节点作为入口节点
        expect(result.state).toBe('success');
        expect(result.nodes.every(n => n.state === 'success')).toBe(true);
    });

    it('应该处理 entryNodeIds 包含不存在的节点', async () => {
        const workflow = createTranslationWorkflow();
        workflow.entryNodeIds = ['node-user', 'non-existent-node']; // 包含不存在的节点

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        // 验证：应该忽略不存在的节点，执行成功
        expect(result.state).toBe('success');
        expect(result.nodes.every(n => n.state === 'success')).toBe(true);
    });

    /**
     * 测试原始的错误场景
     *
     * 这个测试应该失败（在修复之前），展示问题的严重性
     */
    it('【当前行为】entryNodeIds 不完整时，部分节点不会执行', async () => {
        const workflow = createTranslationWorkflow();
        // entryNodeIds 只包含 node-user，缺少 node-system

        // 执行工作流
        const result = await lastValueFrom(scheduler.schedule(workflow, workflow));

        // 【当前行为】系统提示词节点不会被执行
        const systemNode = result.nodes.find(n => n.id === 'node-system');

        // 这个测试应该失败，因为当前实现有 bug
        // 修复后，这个测试应该通过（systemNode.state 应该是 'success'）
        console.log('systemNode state:', systemNode?.state);
        console.log('systemNode count:', systemNode?.count);

        // 【当前行为】LLM 节点可能无法执行，因为缺少系统提示词输入
        const llmNode = result.nodes.find(n => n.id === 'node-llm') as TextAreaAst;
        console.log('llmNode state:', llmNode?.state);
        console.log('llmNode input:', llmNode?.input);

        // 这里我们记录当前的错误行为，而不是断言
        // 这样可以清楚地看到问题所在
    });
});
