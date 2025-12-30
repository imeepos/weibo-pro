import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { root, logger } from '@sker/core';
import { entitiesProviders, useEntityManager, UserRelationStatisticsQueries } from '@sker/entities';
import { CronSchedulerService } from '@sker/workflow-run';
import * as schedule from 'node-schedule';

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
  root.set([...entitiesProviders]);
  await root.init();

  const scheduler = root.get(CronSchedulerService);

  // 初始化调度器（从数据库加载所有启用的调度）
  await scheduler.initializeSchedules();

  // 用户关系统计增量更新任务
  const runUserRelationStats = async () => {
    try {
      logger.info('🔄 开始执行用户关系增量统计...');
      const startTime = Date.now();

      const result = await useEntityManager(manager =>
        UserRelationStatisticsQueries.runIncrementalStats(manager, {
          maxRecords: 50000 // 每次处理5万条记录
        })
      );

      const duration = Date.now() - startTime;
      logger.info('✅ 用户关系增量统计完成', {
        duration: `${duration}ms`,
        repost: result.repost,
        comment: result.comment,
        like: result.like,
        total: result.repost + result.comment + result.like
      });
    } catch (error: any) {
      logger.error('❌ 用户关系增量统计失败', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  // 每小时执行一次（在每小时的第5分钟执行，避免整点高峰）
  const statsJob = schedule.scheduleJob('5 * * * *', runUserRelationStats);

  // 启动时立即执行一次
  runUserRelationStats();

  logger.info('✅ Crawler 服务启动成功', {
    schedulerType: 'node-schedule',
    activeJobs: scheduler.getJobCount(),
    userStatsJob: statsJob ? 'scheduled' : 'failed'
  });

  // 优雅关闭
  const shutdown = async () => {
    logger.info('📴 Crawler 服务关闭中...');

    // 取消用户关系统计任务
    if (statsJob) {
      statsJob.cancel();
      logger.info('✅ 用户关系统计任务已取消');
    }

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

