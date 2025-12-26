import { Injectable, Inject } from '@sker/core';
import { useQueue, type MessageEnvelope } from '@sker/mq';
import { Subscription } from 'rxjs';
import { TaskRegistry } from './task-registry.js';
import { CLI_CONFIG, type CliConfig } from './tokens.js';

interface TaskMessage {
  type: string;
  payload: any;
}

@Injectable({ providedIn: 'auto' })
export class TaskExecutor {
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject(CLI_CONFIG) private config: CliConfig,
    private registry: TaskRegistry
  ) {}

  start(): void {
    for (const queue of this.config.queues) {
      const { consumer$ } = useQueue<TaskMessage>(queue.name);

      const sub = consumer$.subscribe({
        next: (envelope) => this.handleMessage(envelope),
        error: (err) => console.error('Queue error:', err.message)
      });

      this.subscriptions.push(sub);
      console.log(`Listening on queue: ${queue.name}`);
    }
  }

  async shutdown(): Promise<void> {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async handleMessage(envelope: MessageEnvelope<TaskMessage>): Promise<void> {
    const { type, payload } = envelope.message;
    const handler = this.registry.get(type);

    if (!handler) {
      console.warn(`Unknown task type: ${type}`);
      envelope.nack(false);
      return;
    }

    try {
      await handler(payload);
      envelope.ack();
    } catch (err) {
      console.error(`Task failed: ${type}`, (err as Error).message);
      envelope.nack(true);
    }
  }
}
