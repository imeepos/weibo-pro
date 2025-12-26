import { Injectable } from '@sker/core';

export type TaskHandler<T = any> = (payload: T) => Promise<void>;

@Injectable({ providedIn: 'auto' })
export class TaskRegistry {
  private handlers = new Map<string, TaskHandler>();

  register(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  get(taskType: string): TaskHandler | undefined {
    return this.handlers.get(taskType);
  }
}
