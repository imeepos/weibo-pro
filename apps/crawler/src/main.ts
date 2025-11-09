import { config } from 'dotenv';
config();

import 'reflect-metadata';
import { registerMqQueueConfig } from '@sker/mq';
import { startWeiboSearchConsumer, startWeiboDetailConsumer } from './consumers';
import { queueConfigs } from './config/queues';

async function bootstrap() {
  console.log('[Crawler] 启动爬虫服务...');

  queueConfigs.forEach(registerMqQueueConfig);

  const consumers = [
    startWeiboSearchConsumer(),
    startWeiboDetailConsumer(),
  ];

  console.log(`[Crawler] ${consumers.length} 个消费者已启动`);

  process.on('SIGTERM', () => {
    console.log('[Crawler] 收到终止信号，优雅关闭...');
    consumers.forEach(c => c.stop());
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Crawler] 收到中断信号，优雅关闭...');
    consumers.forEach(c => c.stop());
    process.exit(0);
  });
}

bootstrap().catch(console.error);
