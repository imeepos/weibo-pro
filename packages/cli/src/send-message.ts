import { root } from '@sker/core';
import { ConfigService } from './config.js';
import { useQueue } from '@sker/mq';
import { createLogger } from './logger.js';

const logger = createLogger();

interface ClaudeInput {
  prompt: string;
  context?: string;
}

export async function sendMessage(message: string, options: { context?: string }): Promise<void> {
  try {
    const configService = root.get(ConfigService);
    const config = configService.load();
    process.env.RABBITMQ_URL = config.rabbitmq.url;

    const { producer } = useQueue<ClaudeInput>('claude-input');

    const payload: ClaudeInput = {
      prompt: message,
      ...(options.context && { context: options.context }),
    };

    producer.next(payload);

    logger.log(`Message sent to claude-input queue`);
    logger.log(`Prompt: ${message}`);
    if (options.context) {
      logger.log(`Context: ${options.context}`);
    }

    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    logger.error(`Failed to send message: ${(err as Error).message}`);
    process.exit(1);
  }
}
