// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { useTask, useTool, useTaskContext, useTaskActions } from './task-react';
import { taskStore } from './task-store';
import type { Task, Tool } from './task-types';

function CurrentTaskProbe() {
  const task = useTask();
  return <div data-testid="current">{task ? task.title : 'none'}</div>;
}

function StatusProbe() {
  const task = useTask();
  return <div data-testid="status">{task ? task.status : 'none'}</div>;
}

function TaskByIdProbe({ id }: { id: string }) {
  const task = useTask(id);
  return <div data-testid="byid">{task ? task.title : 'none'}</div>;
}

function ToolProbe({ id }: { id: string }) {
  const tool = useTool(id);
  return <div data-testid="tool">{tool ? tool.name : 'none'}</div>;
}

function ContextProbe() {
  const ctx = useTaskContext();
  return <div data-testid="ctx">{ctx}</div>;
}

function ActionsProbe() {
  const actions = useTaskActions();
  return <div data-testid="actions">{typeof actions.addTask === 'function' ? 'ok' : 'no'}</div>;
}

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

describe('task-react hooks', () => {
  beforeEach(() => {
    cleanup();
  });

  it('useTask 未设置当前任务时返回 undefined', () => {
    taskStore.setCurrentTask('nonexistent');
    render(<CurrentTaskProbe />);
    expect(screen.getByTestId('current').textContent).toBe('none');
  });

  it('useTask 返回当前任务', () => {
    taskStore.addTask(makeTask('t1', { title: '写代码' }));
    taskStore.setCurrentTask('t1');
    render(<CurrentTaskProbe />);
    expect(screen.getByTestId('current').textContent).toBe('写代码');
  });

  it('useTask 通过 useSyncExternalStore 响应状态更新', () => {
    taskStore.addTask(makeTask('t2'));
    taskStore.setCurrentTask('t2');
    render(<StatusProbe />);
    expect(screen.getByTestId('status').textContent).toBe('pending');
    act(() => {
      taskStore.updateTask('t2', { status: 'running' });
    });
    expect(screen.getByTestId('status').textContent).toBe('running');
  });

  it('useTask(id) 返回指定任务', () => {
    taskStore.addTask(makeTask('x1', { title: '指定任务' }));
    render(<TaskByIdProbe id="x1" />);
    expect(screen.getByTestId('byid').textContent).toBe('指定任务');
  });

  it('useTool 返回已注册工具', () => {
    const tool: Tool = { id: 'tool1', name: 'search', params: [], execute: () => undefined };
    taskStore.registerTool(tool);
    render(<ToolProbe id="tool1" />);
    expect(screen.getByTestId('tool').textContent).toBe('search');
  });

  it('useTool 未注册时返回 undefined', () => {
    render(<ToolProbe id="ghost" />);
    expect(screen.getByTestId('tool').textContent).toBe('none');
  });

  it('useTaskContext 无当前任务返回占位符', () => {
    taskStore.setCurrentTask('nonexistent');
    render(<ContextProbe />);
    expect(screen.getByTestId('ctx').textContent).toBe('# 无当前任务');
  });

  it('useTaskContext 渲染任务 markdown', () => {
    taskStore.addTask(
      makeTask('m1', { title: '主任务', description: '实现功能', status: 'running', runner: 'agent' })
    );
    taskStore.setCurrentTask('m1');
    render(<ContextProbe />);
    const text = screen.getByTestId('ctx').textContent!;
    expect(text).toContain('# 主任务');
    expect(text).toContain('▶️ running');
    expect(text).toContain('**执行者**: agent');
    expect(text).toContain('实现功能');
  });

  it('useTaskContext 渲染子任务列表', () => {
    taskStore.addTask(makeTask('p1', { title: '父任务', childIds: ['c1'] }));
    taskStore.addTask(makeTask('c1', { title: '子任务', status: 'completed', parentId: 'p1' }));
    taskStore.setCurrentTask('p1');
    render(<ContextProbe />);
    const text = screen.getByTestId('ctx').textContent!;
    expect(text).toContain('## 子任务');
    expect(text).toContain('- [✅] 子任务');
  });

  it('useTaskContext 渲染可用工具', () => {
    taskStore.addTask(makeTask('m2'));
    taskStore.setCurrentTask('m2');
    taskStore.registerTool({
      id: 't1',
      name: 'search',
      params: [{ name: 'q', type: 'string' }],
      execute: () => undefined,
    });
    render(<ContextProbe />);
    const text = screen.getByTestId('ctx').textContent!;
    expect(text).toContain('## 可用工具');
    expect(text).toContain('- search(q: string)');
  });

  it('useTaskActions 暴露 store 操作', () => {
    render(<ActionsProbe />);
    expect(screen.getByTestId('actions').textContent).toBe('ok');
  });
});
