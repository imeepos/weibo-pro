/**
 * TaskExecutor - 任务执行器
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { TaskManager } from './task-manager.js';
import type { ClaudeCommand } from './types/claude-types.js';

export class TaskExecutor {
  constructor(private taskManager: TaskManager) {}

  async executeTask(command: ClaudeCommand): Promise<void> {
    const task = this.taskManager.getTask(command.taskId);
    if (!task) return;

    try {
      this.taskManager.updateTask(command.taskId, { status: 'running' });

      const result = query({
        prompt: command.command,
        cwd: command.cwd,
        model: command.model,
        permissionMode: command.permissionMode,
        resume: command.sessionId,
      });

      for await (const message of result) {
        if (message.type === 'text') {
          this.taskManager.addMessage(command.taskId, message.text || '');
        } else if (message.type === 'result') {
          this.taskManager.updateProgress(command.taskId, 100);
        }
      }

      this.taskManager.updateTask(command.taskId, { status: 'complete' });
    } catch (error) {
      this.taskManager.updateTask(command.taskId, { status: 'error' });
      this.taskManager.addMessage(command.taskId, `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async start(): Promise<void> {
    this.taskManager.on('task-added', (task) => {
      if (this.taskManager.canStartTask()) {
        this.executeTask(task.command);
      }
    });
  }
}
