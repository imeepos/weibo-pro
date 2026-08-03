import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks } from './test-utils';
import { CodeAgent, createTask, createContext } from '../../eight-generals';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

beforeEach(setupMocks);

describe('CodeAgent (pure logic)', () => {
  it('exposes capabilities and composed tool list', () => {
    const agent = new CodeAgent();

    expect(agent.role).toBe('zheng');
    expect(agent.name).toBe('正将');
    expect(agent.getCapabilities().map((c) => c.name)).toContain('write_code');

    const toolNames = agent.getTools().map((t) => t.name);
    expect(toolNames).toContain('read_file');
    expect(toolNames).toContain('write_file');
    expect(toolNames).toContain('execute_command');
    expect(toolNames).toContain('type_check');
    expect(toolNames).toContain('npm_run');
  });

  it('buildSystemPrompt() appends coding principles', () => {
    const agent = new CodeAgent();
    const context = createContext('/tmp/proj');

    const prompt = (agent as any).buildSystemPrompt(context);

    expect(prompt).toContain('正将');
    expect(prompt).toContain('编码原则');
    expect(prompt).toContain('不过度设计');
  });

  it('doExecute() invokes its react agent and returns a summary', async () => {
    const invoke = vi.fn().mockResolvedValue({
      messages: [{ content: '完成' }],
    });
    vi.mocked(createReactAgent).mockImplementation(() => ({ invoke }) as any);
    const agent = new CodeAgent();
    const task = createTask({ type: 'code', description: '写个函数', assignedTo: 'zheng' });
    const context = createContext('/tmp');

    const result = await (agent as any).doExecute(task, context);

    expect(invoke).toHaveBeenCalledTimes(1);
    const args = invoke.mock.calls[0]!;
    expect(args[0].messages).toEqual([
      { role: 'system', content: expect.any(String) },
      { role: 'user', content: '写个函数' },
    ]);
    expect(args[1]).toEqual({
      configurable: { thread_id: `${context.sessionId}_${task.id}` },
    });
    expect(result).toEqual({ messages: 1, lastMessage: '完成' });
  });
});
