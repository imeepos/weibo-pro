import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGeneral, setupMocks } from './test-utils';
import { createTask, createContext } from '../../eight-generals';

beforeEach(setupMocks);

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
