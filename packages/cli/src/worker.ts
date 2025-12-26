import { root } from '@sker/core';
import { ConfigService } from './config.js';
import { TaskRegistry } from './task-registry.js';
import { TaskExecutor } from './task-executor.js';
import { CLI_CONFIG } from './tokens.js';
import { createLogger } from './logger.js';
import { removePid } from './daemon.js';
import { writeHeartbeat } from './heartbeat.js';

const logger = createLogger();

console.log = (msg) => logger.log(String(msg));
console.error = (msg) => logger.error(String(msg));

let heartbeatInterval: NodeJS.Timeout;

async function bootstrap(): Promise<() => Promise<void>> {
  const configService = root.get(ConfigService);
  const config = configService.load();
  process.env.RABBITMQ_URL = config.rabbitmq.url;
  root.set([{ provide: CLI_CONFIG, useValue: config }]);

  const registry = root.get(TaskRegistry);
  registry.register('echo', async (payload) => {
    console.log('Echo: ' + JSON.stringify(payload));
  });

  const executor = root.get(TaskExecutor);
  executor.start();
  console.log('Worker started');

  heartbeatInterval = setInterval(() => {
    writeHeartbeat({ status: 'running' });
  }, 5000);

  return async () => {
    console.log('Shutting down...');
    clearInterval(heartbeatInterval);
    await executor.shutdown();
    removePid();
    console.log('Shutdown complete');
  };
}

let shutdown: () => Promise<void>;

bootstrap()
  .then((fn) => { shutdown = fn; })
  .catch((err) => {
    console.error('Bootstrap failed: ' + err.message);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  if (shutdown) await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (shutdown) await shutdown();
  process.exit(0);
});
