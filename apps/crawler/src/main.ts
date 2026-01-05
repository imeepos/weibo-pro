import 'dotenv/config';
import 'reflect-metadata';
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { root, logger } from '@sker/core';
import {
  entitiesProviders,
  useEntityManager,
  UserRelationStatisticsQueries,
  OverviewStatisticsQueries,
  EventStatisticsService,
  EventEntity
} from '@sker/entities';
import { EdgeModeStrategyProviders } from '@sker/workflow';
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
  root.set([...entitiesProviders, ...EdgeModeStrategyProviders]);
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
          maxRecords: 5000 // 每次处理5万条记录
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

  // 每10分钟执行一次
  const statsJob = schedule.scheduleJob('*/10 * * * *', runUserRelationStats);

  // 概览统计增量更新任务
  const runOverviewStats = async () => {
    try {
      logger.info('🔄 开始执行概览增量统计...');
      const startTime = Date.now();

      const result = await useEntityManager(manager =>
        OverviewStatisticsQueries.runIncrementalStats(manager)
      );

      const duration = Date.now() - startTime;
      logger.info('✅ 概览增量统计完成', {
        duration: `${duration}ms`,
        hourly: result.hourly,
        daily: result.daily
      });
    } catch (error: any) {
      logger.error('❌ 概览增量统计失败', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  const overviewStatsJob = schedule.scheduleJob('*/10 * * * *', runOverviewStats);

  // 事件统计小时级任务
  const runHourlyEventStats = async () => {
    try {
      logger.info('🔄 开始执行事件统计（小时级）...');
      const startTime = Date.now();

      const statsService = root.get(EventStatisticsService);
      await statsService.generateHourlyStatisticsForAllEvents();

      const duration = Date.now() - startTime;
      logger.info('✅ 事件统计（小时级）完成', {
        duration: `${duration}ms`
      });
    } catch (error: any) {
      logger.error('❌ 事件统计（小时级）失败', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  const hourlyEventStatsJob = schedule.scheduleJob('0 * * * *', runHourlyEventStats);

  // 启动时立即执行一次
  runUserRelationStats();
  runOverviewStats();
  runHourlyEventStats();

  logger.info('✅ Crawler 服务启动成功', {
    schedulerType: 'node-schedule',
    activeJobs: scheduler.getJobCount(),
    userStatsJob: statsJob ? 'scheduled' : 'failed',
    overviewStatsJob: overviewStatsJob ? 'scheduled' : 'failed',
    eventStatsJob: hourlyEventStatsJob ? 'scheduled' : 'failed'
  });

  // 优雅关闭
  const shutdown = async () => {
    logger.info('📴 Crawler 服务关闭中...');

    // 取消统计任务
    if (statsJob) {
      statsJob.cancel();
      logger.info('✅ 用户关系统计任务已取消');
    }
    if (overviewStatsJob) {
      overviewStatsJob.cancel();
      logger.info('✅ 概览统计任务已取消');
    }
    if (hourlyEventStatsJob) {
      hourlyEventStatsJob.cancel();
      logger.info('✅ 事件统计任务已取消');
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

