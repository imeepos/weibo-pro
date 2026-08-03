import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock LLM / langchain / external business deps — no real API calls.
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(
    class {
      config: unknown;
      constructor(config?: unknown) {
        this.config = config;
      }
    }
  ),
}));

vi.mock('langchain', () => ({
  createAgent: vi.fn(),
}));

vi.mock('@langchain/langgraph', () => ({
  InMemoryStore: vi.fn(class InMemoryStore {}),
  MemorySaver: vi.fn(class MemorySaver {}),
}));

vi.mock('@sker/nlp', () => ({
  NLPAnalyzer: class {},
}));

vi.mock('@sker/entities', () => ({
  WeiboPostEntity: class {},
  PostNLPResultEntity: class {},
  EventEntity: class {},
  EventHourlyStatisticsEntity: class {},
  useEntityManager: vi.fn(),
}));

vi.mock('@langchain/core/tools', () => ({
  tool: vi.fn((fn: unknown, config: Record<string, unknown>) => ({
    ...config,
    invoke: fn,
  })),
}));

import { ResearchAgent } from '../ResearchAgent';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';
import type { ResearchTask } from '../types';

const makeTask = (overrides: Partial<ResearchTask> = {}): ResearchTask => ({
  id: 'task-1',
  query: '分析某事件的舆情',
  ...overrides,
});

describe('ResearchAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a langchain agent wired with 6 business tools', () => {
    let createAgentArg: {
      model: unknown;
      tools: Array<{ name: string }>;
      store: unknown;
      checkpointer: unknown;
    } | undefined;

    vi.mocked(createAgent).mockImplementation((arg: any) => {
      createAgentArg = arg;
      return { invoke: vi.fn() } as any;
    });

    new ResearchAgent({} as any);

    expect(createAgent).toHaveBeenCalledTimes(1);
    expect(createAgentArg).toBeDefined();
    expect(createAgentArg!.model).toBeDefined();
    expect(createAgentArg!.tools).toHaveLength(6);
    expect(createAgentArg!.tools.map((t) => t.name)).toEqual([
      'query_posts',
      'query_events',
      'query_posts_by_event',
      'query_event_timeline',
      'analyze_event_milestones',
      'nlp_analyze',
    ]);
    expect(createAgentArg!.store).toBeDefined();
    expect(createAgentArg!.checkpointer).toBeDefined();
  });

  it('configures ChatOpenAI with the default proxy base URL', () => {
    vi.mocked(createAgent).mockReturnValue({ invoke: vi.fn() } as any);

    new ResearchAgent({} as any);

    expect(ChatOpenAI).toHaveBeenCalledWith({
      modelName: 'deepseek-ai/DeepSeek-V3.2',
      temperature: 0.3,
      configuration: {
        baseURL: 'http://localhost:8089/api/auth/llm/openai',
      },
    });
  });

  it('instantiates InMemoryStore and MemorySaver as checkpointer', () => {
    vi.mocked(createAgent).mockReturnValue({ invoke: vi.fn() } as any);

    new ResearchAgent({} as any);

    expect(InMemoryStore).toHaveBeenCalledTimes(1);
    expect(MemorySaver).toHaveBeenCalledTimes(1);
  });

  it('uses API_BASE_URL env var to build the proxy base URL', async () => {
    // Re-import the module so the module-level LLM_PROXY_BASE_URL constant is
    // re-computed while API_BASE_URL is set.
    vi.resetModules();
    vi.stubEnv('API_BASE_URL', 'http://proxy.test');

    const { ResearchAgent: ReloadedAgent } = await import('../ResearchAgent.js');
    const { ChatOpenAI: ReloadedChatOpenAI } = await import('@langchain/openai');
    const { createAgent: ReloadedCreateAgent } = await import('langchain');

    (ReloadedCreateAgent as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invoke: vi.fn(),
    });

    new ReloadedAgent({} as any);

    expect(ReloadedChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: {
          baseURL: 'http://proxy.test/api/auth/llm/openai',
        },
      })
    );
  });

  it('research() invokes the agent and returns a structured report', async () => {
    const agentInvoke = vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content: '这是最终研究报告' }],
    });
    vi.mocked(createAgent).mockReturnValue({ invoke: agentInvoke } as any);

    const agent = new ResearchAgent({} as any);
    const task = makeTask();

    const report = await agent.research(task);

    expect(agentInvoke).toHaveBeenCalledTimes(1);
    expect(agentInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: expect.any(String) },
          { role: 'user', content: task.query },
        ],
      }),
      expect.objectContaining({ configurable: { thread_id: task.id } })
    );

    expect(report.taskId).toBe(task.id);
    expect(report.query).toBe(task.query);
    expect(report.report).toBe('这是最终研究报告');
    expect(report.rawData).toHaveLength(1);
    expect(report.rawData[0]).toMatchObject({
      stepId: 'msg-0',
      data: { role: 'assistant' },
    });
    expect(typeof report.timestamp).toBe('number');
  });

  it('serializes non-string agent content into the report', async () => {
    const agentInvoke = vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content: { text: '结构化输出' } }],
    });
    vi.mocked(createAgent).mockReturnValue({ invoke: agentInvoke } as any);

    const agent = new ResearchAgent({} as any);
    const report = await agent.research(makeTask({ id: 'task-2' }));

    expect(report.report).toBe(JSON.stringify({ text: '结构化输出' }));
  });

  it('falls back to a default message when last message has no content', async () => {
    const agentInvoke = vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content: undefined }],
    });
    vi.mocked(createAgent).mockReturnValue({ invoke: agentInvoke } as any);

    const agent = new ResearchAgent({} as any);
    const report = await agent.research(makeTask({ id: 'task-3' }));

    expect(report.report).toBe('分析失败');
  });

  it('rethrows when the agent invocation fails', async () => {
    const agentInvoke = vi
      .fn()
      .mockRejectedValue(new Error('LLM 调用失败'));
    vi.mocked(createAgent).mockReturnValue({ invoke: agentInvoke } as any);

    const agent = new ResearchAgent({} as any);

    await expect(agent.research(makeTask())).rejects.toThrow('LLM 调用失败');
  });
});
