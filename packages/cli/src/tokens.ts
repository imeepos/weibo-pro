import { InjectionToken } from '@sker/core';

export interface CliConfig {
  id: string;
  name: string;
  description: string;
  rabbitmq: { url: string };
  queues: Array<{ name: string; prefetch?: number }>;
}

export const CLI_CONFIG = new InjectionToken<CliConfig>('CLI_CONFIG');
