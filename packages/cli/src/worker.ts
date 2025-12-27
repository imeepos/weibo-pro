/**
 * Worker - CLI Daemon 工作进程
 *
 * 存在即合理:
 * - 后台运行的工作进程
 * - 初始化 DI 容器和服务
 * - 通过 Socket.IO 连接 API 服务器
 */

import { root } from '@sker/core';
import { ConfigService } from './config.js';
import { ClaudeBridge } from './claude-bridge.js';
import { ClaudeSdkService } from './services/claude-sdk.service.js';
import { CLI_CONFIG } from './tokens.js';
import { createLogger } from './logger.js';
import { removePid } from './daemon.js';
import { writeHeartbeat } from './heartbeat.js';

const logger = createLogger();

console.log = (msg) => logger.log(String(msg));
console.error = (msg) => logger.error(String(msg));

let heartbeatInterval: NodeJS.Timeout;

async function bootstrap(): Promise<() => Promise<void>> {
  // 加载配置
  const configService = root.get(ConfigService);
  const config = configService.load();
  root.set([{ provide: CLI_CONFIG, useValue: config }]);

  // 初始化 Claude SDK 服务
  root.get(ClaudeSdkService);

  // 启动 Claude 桥接器（Socket.IO 客户端）
  const claudeBridge = root.get(ClaudeBridge);
  claudeBridge.start();

  console.log('Worker started');

  // 启动心跳
  heartbeatInterval = setInterval(() => {
    writeHeartbeat({ status: 'running' });
  }, 5000);

  // 返回关闭函数
  return async () => {
    console.log('Shutting down...');
    clearInterval(heartbeatInterval);
    await claudeBridge.shutdown();
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
