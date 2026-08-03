import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeGeneral, setupMocks } from './test-utils';
import { Orchestrator, createTask, createContext } from '../../eight-generals';
import type { GeneralRole, BaseGeneral } from '../../eight-generals';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

beforeEach(setupMocks);

describe('Orchestrator', () => {
  it('register()/registerAll() store generals by role', () => {
    const orchestrator = new Orchestrator();
    const generals = () =>
      (orchestrator as any).generals as Map<GeneralRole, BaseGeneral>;

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
