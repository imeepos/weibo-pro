import { BehaviorSubject, Observable } from 'rxjs';
import type { Task, Tool } from './task-types';

interface TaskState {
  tasks: Map<string, Task>;
  tools: Map<string, Tool>;
  currentTaskId?: string;
}

const initialState: TaskState = {
  tasks: new Map(),
  tools: new Map(),
};

export class TaskStore {
  private state$ = new BehaviorSubject<TaskState>(initialState);

  get state(): TaskState {
    return this.state$.value;
  }

  observe(): Observable<TaskState> {
    return this.state$.asObservable();
  }

  addTask(task: Task): void {
    const { tasks } = this.state$.value;
    const newTasks = new Map(tasks);
    newTasks.set(task.id, task);

    if (task.parentId) {
      const parent = newTasks.get(task.parentId);
      if (parent && !parent.childIds.includes(task.id)) {
        newTasks.set(task.parentId, {
          ...parent,
          childIds: [...parent.childIds, task.id],
        });
      }
    }

    this.state$.next({ ...this.state$.value, tasks: newTasks });
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const { tasks } = this.state$.value;
    const task = tasks.get(id);
    if (!task) return;

    const newTasks = new Map(tasks);
    newTasks.set(id, { ...task, ...updates });
    this.state$.next({ ...this.state$.value, tasks: newTasks });
  }

  registerTool(tool: Tool): void {
    const { tools } = this.state$.value;
    const newTools = new Map(tools);
    newTools.set(tool.id, tool);
    this.state$.next({ ...this.state$.value, tools: newTools });
  }

  setCurrentTask(id: string): void {
    this.state$.next({ ...this.state$.value, currentTaskId: id });
  }

  getTask(id: string): Task | undefined {
    return this.state$.value.tasks.get(id);
  }

  getCurrentTask(): Task | undefined {
    const { currentTaskId, tasks } = this.state$.value;
    return currentTaskId ? tasks.get(currentTaskId) : undefined;
  }
}

export const taskStore = new TaskStore();
