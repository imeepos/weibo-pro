import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { root, logger } from '@sker/core';
import {
  entitiesProviders,
} from '@sker/entities';
import { EdgeModeStrategyProviders } from '@sker/workflow';
import { CronSchedulerService } from '@sker/workflow-run';

/**
 * Crawler 服务启动入口
 *
 * 存在即合理：
 * - 专注异步任务处理（工作流调度）
 * - 独立部署，不影响 API 服务性能
 * - 职责清晰：基于 node-schedule 的精确调度
 *
 * 优雅设计：
 * - 使用 CronSchedulerService 替换轮询机制
 * - 支持分布式锁，多实例安全
 * - 优雅关闭，清理所有调度任务
 */
async function bootstrap() {
  root.set([...entitiesProviders, ...EdgeModeStrategyProviders]);
  await root.init();

  const scheduler = root.get(CronSchedulerService);

  // 初始化调度器（从数据库加载所有启用的调度）
  await scheduler.initializeSchedules();

  // 优雅关闭
  const shutdown = async () => {
    logger.info('📴 Crawler 服务关闭中...');

    await scheduler.stopAll();
    logger.info('✅ Crawler 服务已关闭');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  logger.error('Crawler 服务启动失败', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

