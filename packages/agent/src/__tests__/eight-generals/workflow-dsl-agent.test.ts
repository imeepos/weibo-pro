import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks } from './test-utils';
import { WorkflowDSLGeneratorAgent, createTask, createContext } from '../../eight-generals';
import { ChatOpenAI } from '@langchain/openai';

beforeEach(setupMocks);

describe('WorkflowDSLGeneratorAgent (pure logic)', () => {
  it('declares no tools and exposes DSL capabilities', () => {
    const agent = new WorkflowDSLGeneratorAgent();

    expect(agent.getTools()).toEqual([]);
    expect(agent.getCapabilities().map((c) => c.name)).toEqual([
      'dsl_generation',
      'dsl_validation',
    ]);
  });

  it('doExecute() generates a DSL that compiles successfully', async () => {
    const structuredInvoke = vi.fn().mockResolvedValue({
      dslCode: 'workflow "w" { }',
      explanation: '测试工作流',
      nodeCount: 0,
      estimatedComplexity: 'simple',
    });
    const withStructuredOutput = vi.fn().mockReturnValue({ invoke: structuredInvoke });
    vi.mocked(ChatOpenAI).mockImplementation(function () {
      return { withStructuredOutput } as any;
    });

    const agent = new WorkflowDSLGeneratorAgent();
    const task = createTask({ type: 'general', description: '生成工作流' });
    task.input = { description: '创建一个登录后搜索关键词的工作流' };
    const context = createContext('/tmp');

    const result = await (agent as any).doExecute(task, context);

    expect(withStructuredOutput).toHaveBeenCalledTimes(1);
    expect(structuredInvoke).toHaveBeenCalledTimes(1);
    expect(result.dslCode).toBe('workflow "w" { }');
    expect(result.estimatedComplexity).toBe('simple');
    // success notification is sent to the orchestrator (ti)
    expect(context.messages).toHaveLength(1);
    expect(context.messages[0]!.to).toBe('ti');
  });

  it('throws when the task has no description', async () => {
    const agent = new WorkflowDSLGeneratorAgent();
    const task = createTask({ type: 'general', description: '空任务' });
    const context = createContext('/tmp');

    await expect((agent as any).doExecute(task, context)).rejects.toThrow(
      '任务描述不能为空'
    );
  });
});
