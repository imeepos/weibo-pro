import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStore } from './task-store';
import type { Task, Tool } from './task-types';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `任务 ${id}`,
    description: `描述 ${id}`,
    status: 'pending',
    childIds: [],
    ...overrides,
  };
}

describe('TaskStore', () => {
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
  });

  it('初始状态为空', () => {
    expect(store.state.tasks.size).toBe(0);
    expect(store.state.tools.size).toBe(0);
    expect(store.state.currentTaskId).toBeUndefined();
    expect(store.getCurrentTask()).toBeUndefined();
  });

  it('addTask 添加任务', () => {
    const task = makeTask('t1');
    store.addTask(task);
    expect(store.getTask('t1')).toEqual(task);
  });

  it('addTask 带 parentId 时更新父任务 childIds', () => {
    const parent = makeTask('p', { title: '父任务' });
    const child = makeTask('c', { parentId: 'p' });
    store.addTask(parent);
    store.addTask(child);
    expect(store.getTask('p')?.childIds).toEqual(['c']);
  });

  it('addTask 不会重复添加已存在的 childId', () => {
    const parent = makeTask('p', { childIds: ['c'] });
    const child = makeTask('c', { parentId: 'p' });
    store.addTask(parent);
    store.addTask(child);
    expect(store.getTask('p')?.childIds).toEqual(['c']);
  });

  it('addTask 当父任务不存在时不抛错', () => {
    const child = makeTask('c', { parentId: 'ghost' });
    expect(() => store.addTask(child)).not.toThrow();
    expect(store.getTask('c')).toEqual(child);
  });

  it('updateTask 更新任务字段', () => {
    const task = makeTask('t1');
    store.addTask(task);
    store.updateTask('t1', { status: 'running' });
    expect(store.getTask('t1')?.status).toBe('running');
  });

  it('updateTask 对不存在的任务 no-op', () => {
    store.updateTask('nope', { status: 'failed' });
    expect(store.state.tasks.size).toBe(0);
  });

  it('registerTool 注册工具', () => {
    const tool: Tool = { id: 'tool1', name: 'search', params: [], execute: () => undefined };
    store.registerTool(tool);
    expect(store.state.tools.get('tool1')).toEqual(tool);
  });

  it('setCurrentTask 设置当前任务', () => {
    const task = makeTask('t1');
    store.addTask(task);
    store.setCurrentTask('t1');
    expect(store.state.currentTaskId).toBe('t1');
    expect(store.getCurrentTask()).toEqual(task);
  });

  it('getCurrentTask 当 currentTaskId 指向不存在的任务时返回 undefined', () => {
    store.setCurrentTask('ghost');
    expect(store.getCurrentTask()).toBeUndefined();
  });

  it('observe 发出初始状态和后续变化', () => {
    const sizes: number[] = [];
    const sub = store.observe().subscribe((s) => sizes.push(s.tasks.size));
    store.addTask(makeTask('t1'));
    store.updateTask('t1', { status: 'completed' });
    expect(sizes).toEqual([0, 1, 1]);
    sub.unsubscribe();
  });
});
