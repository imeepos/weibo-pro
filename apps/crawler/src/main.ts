import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { useQueue } from '@sker/mq'
import { from, switchMap } from 'rxjs';
import { root, logger } from '@sker/core';
import { entitiesProviders } from '@sker/entities';
import { WeiboAccountService, WeiboLoginSuccessMessage } from '@sker/workflow-run';
import { WorkflowSchedulerWorker } from './scheduler-worker';

/**
 * Crawler 服务启动入口
 *
 * 存在即合理：
 * - 专注异步任务处理（MQ消费 + 定时调度）
 * - 独立部署，不影响 API 服务性能
 * - 职责清晰：爬虫执行和工作流调度
 *
 * 优雅设计：
 * - 启动 MQ 消费者监听登录事件
 * - 启动工作流调度器自动执行定时任务
 * - 优雅关闭，清理所有订阅
 */
async function bootstrap() {
  root.set([...entitiesProviders]);
  await root.init();

  const schedulerWorker = root.get(WorkflowSchedulerWorker);

  await schedulerWorker.start();
  // 优雅关闭
  const shutdown = async () => {
    logger.info('📴 Crawler 服务关闭中...');
    await schedulerWorker.stop();
    logger.info('✅ Crawler 服务已关闭');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(console.error);
