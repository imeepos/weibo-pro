import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock LLM / langchain / workflow deps so nothing hits a real service ---
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(
    class {
      config: unknown;
      withStructuredOutput: () => unknown;
      constructor(config?: unknown) {
        this.config = config;
        this.withStructuredOutput = () => this;
      }
    }
  ),
}));

vi.mock('@langchain/langgraph', () => ({
  MemorySaver: vi.fn(class MemorySaver {}),
}));

vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: vi.fn(() => ({ invoke: vi.fn() })),
}));

vi.mock('@langchain/core/tools', () => ({
  tool: vi.fn((fn: unknown, config: Record<string, unknown>) => ({
    ...config,
    invoke: fn,
  })),
}));

vi.mock('@sker/workflow', () => ({
  getAllNodeTypes: vi.fn(() => []),
  findNodeType: vi.fn(() => undefined),
  NODE: Symbol('NODE'),
}));

vi.mock('@sker/workflow-compiler', () => ({
  compile: vi.fn(() => ({ success: true })),
}));

import {
  BaseGeneral,
  Orchestrator,
  CodeAgent,
  WorkflowDSLGeneratorAgent,
  createEightGenerals,
} from '../eight-generals';
import { createTask, createContext } from '../eight-generals';
import type {
  GeneralRole,
  AgentTask,
  AgentContext,
  AgentCapability,
} from '../eight-generals';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

/** A controllable, LLM-free general used to test orchestration logic. */
class FakeGeneral extends BaseGeneral {
  readonly role: GeneralRole;
  readonly description: string;

  /** Override-able hook for doExecute; records the tasks it receives. */
  public executeImpl?: (task: AgentTask, context: AgentContext) => Promise<unknown>;

  constructor(role: GeneralRole, description = 'fake general') {
    super(0.1);
    this.role = role;
    this.description = description;
    this.initState();
  }

  getCapabilities(): AgentCapability[] {
    return [{ name: 'fake', description: 'fake capability' }];
  }

  getTools() {
    return [];
  }

  protected async doExecute(task: AgentTask, context: AgentContext): Promise<unknown> {
    if (this.executeImpl) {
      return this.executeImpl(task, context);
    }
    return { handled: true, taskId: task.id };
  }
}

const reactAgentInvoke = () => ({ invoke: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ChatOpenAI).mockImplementation(function (this: any) {
    this.withStructuredOutput = () => this;
    return this;
  });
  vi.mocked(createReactAgent).mockImplementation(reactAgentInvoke);
});

describe('createEightGenerals', () => {
  it('returns an Orchestrator with all eight general roles registered', () => {
    const orchestrator = createEightGenerals();

    expect(orchestrator).toBeInstanceOf(Orchestrator);
    expect(orchestrator.role).toBe('ti');
    expect(orchestrator.name).toBe('提将');
    expect(orchestrator.title).toBe('Orchestrator');

    const generals = (orchestrator as any).generals as Map<GeneralRole, BaseGeneral>;
    expect(generals.size).toBe(7);
    expect(Array.from(generals.keys()).sort()).toEqual([
      'chu',
      'fan',
      'feng',
      'huo',
      'tuo',
      'yao',
      'zheng',
    ]);
  });
});

describe('BaseGeneral', () => {
  it('exposes name, title, capabilities and idle state', () => {
    const g = new FakeGeneral('zheng', '编写代码');

    expect(g.name).toBe('正将');
    expect(g.title).toBe('CodeAgent');
    expect(g.isIdle()).toBe(true);
    expect(g.getState().role).toBe('zheng');
    expect(g.getState().status).toBe('idle');
    expect(g.getState().capabilities).toEqual([
      { name: 'fake', description: 'fake capability' },
    ]);
  });

  it('execute() returns a success result and resets agent state', async () => {
    const g = new FakeGeneral('fan');
    const task = createTask({
      type: 'architecture',
      description: '设计系统',
      assignedTo: 'fan',
    });
    const context = createContext('/tmp/proj');

    const result = await g.execute(task, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ handled: true, taskId: task.id });
    expect(typeof result.duration).toBe('number');
    expect(result.error).toBeUndefined();
    expect(g.isIdle()).toBe(true);
    expect(g.getState().currentTask).toBeUndefined();
  });

  it('execute() returns a failure result when doExecute throws', async () => {
    const g = new FakeGeneral('chu');
    g.executeImpl = async () => {
      throw new Error('boom');
    };
    const task = createTask({ type: 'fix', description: '修 bug' });
    const context = createContext('/tmp/proj');

    const result = await g.execute(task, context);

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
    expect(result.data).toBeUndefined();
    expect(g.isIdle()).toBe(true);
  });

  it('sendMessage() appends an AgentMessage to context', () => {
    const g = new FakeGeneral('zheng');
    const context = createContext('/tmp');

    const msg = (g as any).sendMessage('ti', 'notification', { hello: 'world' }, context);

    expect(context.messages).toHaveLength(1);
    expect(context.messages[0]).toBe(msg);
    expect(msg.from).toBe('zheng');
    expect(msg.to).toBe('ti');
    expect(msg.type).toBe('notification');
    expect(msg.payload).toEqual({ hello: 'world' });
    expect(typeof msg.id).toBe('string');
  });

  it('buildSystemPrompt() embeds role metadata and project info', () => {
    const g = new FakeGeneral('zheng', '代码实现专家');
    const context = createContext('/tmp/proj');

    const prompt = (g as any).buildSystemPrompt(context);

    expect(prompt).toContain('正将');
    expect(prompt).toContain('CodeAgent');
    expect(prompt).toContain('代码实现专家');
    expect(prompt).toContain('/tmp/proj');
    expect(prompt).toContain(context.sessionId);
  });
});

describe('Orchestrator', () => {
  it('register()/registerAll() store generals by role', () => {
    const orchestrator = new Orchestrator();
    const generals = () => (orchestrator as any).generals as Map<GeneralRole, BaseGeneral>;

    expect(generals().size).toBe(0);

    orchestrator.register(new FakeGeneral('zheng'));
    expect(generals().size).toBe(1);

    const ret = orchestrator.registerAll([new FakeGeneral('fan'), new FakeGeneral('yao')]);
    expect(ret).toBe(orchestrator);
    expect(generals().size).toBe(3);
  });

  it('getTools() exposes create_task and query_agents with zod schemas', () => {
    const orchestrator = new Orchestrator();
    const tools = orchestrator.getTools();

    const names = tools.map((t) => t.name);
    expect(names).toContain('create_task');
    expect(names).toContain('query_agents');

    const createTaskTool = tools.find((t) => t.name === 'create_task');
    expect(createTaskTool).toBeDefined();
    expect((createTaskTool as any).schema).toBeDefined();
    expect((createTaskTool as any).description).toContain('创建并分配任务');
  });

  it('run() executes planned tasks via registered generals', async () => {
    const planInvoke = vi.fn().mockResolvedValue({
      messages: [
        {
          tool_calls: [
            {
              name: 'create_task',
              args: {
                type: 'code',
                description: '实现登录',
                assignedTo: 'zheng',
                priority: 'high',
              },
            },
            {
              name: 'create_task',
              args: {
                type: 'architecture',
                description: '设计表结构',
                assignedTo: 'fan',
                priority: 'normal',
              },
            },
          ],
        },
      ],
    });
    vi.mocked(createReactAgent).mockImplementation(() => ({ invoke: planInvoke }) as any);

    const orchestrator = new Orchestrator();
    const zheng = new FakeGeneral('zheng');
    const fan = new FakeGeneral('fan');
    orchestrator.registerAll([zheng, fan]);
    const zhengSpy = vi.spyOn(zheng, 'execute');
    const fanSpy = vi.spyOn(fan, 'execute');

    const result = await orchestrator.run('实现用户登录功能', '/tmp/proj');

    expect(result.success).toBe(true);
    expect(planInvoke).toHaveBeenCalledTimes(1);

    // scheduler prompt contains the user request
    const firstCallArgs = planInvoke.mock.calls[0]![0];
    expect(firstCallArgs.messages[1]).toMatchObject({ role: 'user' });
    expect(firstCallArgs.messages[1].content).toBe('实现用户登录功能');

    const data = result.data as any;
    expect(data.taskCount).toBe(2);
    expect(data.sessionId).toBeTypeOf('string');
    expect(Object.keys(data.results)).toHaveLength(2);
    expect(data.artifacts).toBeDefined();

    expect(zhengSpy).toHaveBeenCalledTimes(1);
    expect(fanSpy).toHaveBeenCalledTimes(1);
    expect(zhengSpy.mock.calls[0]![0]).toMatchObject({
      assignedTo: 'zheng',
      description: '实现登录',
    });
    expect(fanSpy.mock.calls[0]![0]).toMatchObject({
      assignedTo: 'fan',
      description: '设计表结构',
    });
  });

  it('run() creates a default zheng task when no create_task tool call is present', async () => {
    const planInvoke = vi.fn().mockResolvedValue({
      messages: [{ content: '我直接处理' }],
    });
    vi.mocked(createReactAgent).mockImplementation(() => ({ invoke: planInvoke }) as any);

    const orchestrator = new Orchestrator();
    orchestrator.register(new FakeGeneral('zheng'));

    const result = await orchestrator.run('实现功能', '/tmp');

    expect(result.success).toBe(true);
    expect((result.data as any).taskCount).toBe(1);
  });

  it('run() reports failure when a task targets an unregistered general', async () => {
    const planInvoke = vi.fn().mockResolvedValue({
      messages: [
        {
          tool_calls: [
            {
              name: 'create_task',
              args: { type: 'code', description: 'x', assignedTo: 'zheng' },
            },
          ],
        },
      ],
    });
    vi.mocked(createReactAgent).mockImplementation(() => ({ invoke: planInvoke }) as any);

    const orchestrator = new Orchestrator();
    // deliberately register nothing

    const result = await orchestrator.run('随便做点事', '/tmp');

    expect(result.success).toBe(false);
    expect(result.error).toContain('未找到智能体');
  });

  it('executePlan() runs tasks in dependency order', async () => {
    const orchestrator = new Orchestrator();
    const order: string[] = [];
    const zheng = new FakeGeneral('zheng');
    zheng.executeImpl = async (task) => {
      order.push(task.id);
      return { done: true };
    };
    const fan = new FakeGeneral('fan');
    fan.executeImpl = async (task) => {
      order.push(task.id);
      return { done: true };
    };
    orchestrator.registerAll([zheng, fan]);

    const context = createContext('/tmp');
    const taskA = createTask({ type: 'code', description: 'A', assignedTo: 'zheng' });
    const taskB = createTask({
      type: 'architecture',
      description: 'B',
      assignedTo: 'fan',
      dependencies: [taskA.id],
    });

    const results = await (orchestrator as any).executePlan([taskA, taskB], context);

    expect(order).toEqual([taskA.id, taskB.id]);
    expect(results.has(taskA.id)).toBe(true);
    expect(results.has(taskB.id)).toBe(true);
  });

  it('executePlan() throws on circular dependencies', async () => {
    const orchestrator = new Orchestrator();
    orchestrator.registerAll([new FakeGeneral('zheng'), new FakeGeneral('fan')]);
    const context = createContext('/tmp');
    const taskA = createTask({ type: 'code', description: 'A', assignedTo: 'zheng' });
    const taskB = createTask({ type: 'architecture', description: 'B', assignedTo: 'fan' });
    taskA.dependencies = [taskB.id];
    taskB.dependencies = [taskA.id];

    await expect(
      (orchestrator as any).executePlan([taskA, taskB], context)
    ).rejects.toThrow('存在循环依赖');
  });

  it('executeTask() marks tasks completed on success and failed on error', async () => {
    const orchestrator = new Orchestrator();
    const ok = new FakeGeneral('zheng');
    const failing = new FakeGeneral('chu');
    failing.executeImpl = async () => {
      throw new Error('测试失败');
    };
    orchestrator.registerAll([ok, failing]);
    const context = createContext('/tmp');

    const okTask = createTask({ type: 'code', description: '成功', assignedTo: 'zheng' });
    const okResult = await (orchestrator as any).executeTask(okTask, context);
    expect(okResult.success).toBe(true);
    expect(okTask.status).toBe('completed');
    expect(okTask.completedAt).toBeTypeOf('number');
    expect(okTask.result).toBeDefined();

    const failTask = createTask({ type: 'fix', description: '失败', assignedTo: 'chu' });
    const failResult = await (orchestrator as any).executeTask(failTask, context);
    expect(failResult.success).toBe(false);
    expect(failTask.status).toBe('failed');
    expect(failTask.error).toBe('测试失败');
  });
});

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

describe('WorkflowDSLGeneratorAgent (pure logic)', () => {
  it('exposes the four DSL tools and DSL capabilities', () => {
    const agent = new WorkflowDSLGeneratorAgent();

    expect(agent.getTools().map((t) => t.name)).toEqual([
      'list_available_nodes',
      'get_node_schema',
      'validate_dsl',
      'compile_dsl',
    ]);
    expect(agent.getCapabilities().map((c) => c.name)).toEqual([
      'dsl_generation',
      'dsl_validation',
      'node_discovery',
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
