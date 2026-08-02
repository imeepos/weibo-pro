import React from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';
import { taskStore, TaskStore } from './task-store';
import type { Task, Tool } from './task-types';

const TaskContext = createContext<TaskStore>(taskStore);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TaskContext.Provider value={taskStore}>{children}</TaskContext.Provider>
);

export function useTask(id?: string): Task | undefined {
  const store = useContext(TaskContext);
  return useSyncExternalStore(
    (callback) => {
      const sub = store.observe().subscribe(callback);
      return () => sub.unsubscribe();
    },
    () => (id ? store.getTask(id) : store.getCurrentTask())
  );
}

export function useTool(toolId: string): Tool | undefined {
  const store = useContext(TaskContext);
  return useSyncExternalStore(
    (callback) => {
      const sub = store.observe().subscribe(callback);
      return () => sub.unsubscribe();
    },
    () => store.state.tools.get(toolId)
  );
}

export function useTaskContext(): string {
  const store = useContext(TaskContext);
  const task = useSyncExternalStore(
    (callback) => {
      const sub = store.observe().subscribe(callback);
      return () => sub.unsubscribe();
    },
    () => store.getCurrentTask()
  );

  if (!task) return '# 无当前任务';

  const { tasks, tools } = store.state;
  const children = task.childIds.map((id) => tasks.get(id)).filter(Boolean) as Task[];

  const statusEmoji = {
    pending: '⏳',
    running: '▶️',
    paused: '⏸️',
    completed: '✅',
    failed: '❌',
  };

  let md = `# ${task.title}\n\n`;
  md += `**状态**: ${statusEmoji[task.status]} ${task.status}\n`;
  md += `**执行者**: ${task.runner || '未分配'}\n\n`;
  md += `${task.description}\n\n`;

  if (children.length > 0) {
    md += `## 子任务\n\n`;
    children.forEach((child) => {
      md += `- [${statusEmoji[child.status]}] ${child.title}\n`;
    });
    md += '\n';
  }

  if (tools.size > 0) {
    md += `## 可用工具\n\n`;
    Array.from(tools.values()).forEach((tool) => {
      const params = tool.params.map((p) => `${p.name}: ${p.type}`).join(', ');
      md += `- ${tool.name}(${params})\n`;
    });
  }

  return md;
}

export function useTaskActions() {
  const store = useContext(TaskContext);
  return {
    addTask: (task: Task) => store.addTask(task),
    updateTask: (id: string, updates: Partial<Task>) => store.updateTask(id, updates),
    registerTool: (tool: Tool) => store.registerTool(tool),
    setCurrentTask: (id: string) => store.setCurrentTask(id),
  };
}
