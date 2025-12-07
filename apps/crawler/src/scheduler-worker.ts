import { Inject, Injectable, logger } from '@sker/core';
import { DataSource } from '@sker/entities';
import { WorkflowScheduleEntity, ScheduleStatus, WorkflowEntity, ScheduleType } from '@sker/entities';
import { fromJson, WorkflowGraphAst, executeAst } from '@sker/workflow';
import { CronExpressionParser } from 'cron-parser';

/**
 * 工作流调度器工作进程
 *
 * 存在即合理：
 * - 轮询数据库查找到期任务
 * - 自动执行 cron/interval/once 调度
 * - 更新下次执行时间
 * - 处理过期任务
 *
 * 优雅设计：
 * - 每30秒扫描一次（可配置）
 * - 并发控制（最多10个任务同时执行）
 * - 防止重复扫描（isRunning 标志）
 * - 错误隔离（单个任务失败不影响其他任务）
 */
@Injectable()
export class WorkflowSchedulerWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly scanIntervalMs = 30_000; // 30秒
  private readonly maxConcurrentRuns = 10;

  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.timer) {
      logger.warn('调度器已在运行');
      return;
    }

    logger.info('启动工作流调度器', {
      scanInterval: `${this.scanIntervalMs / 1000}秒`,
      maxConcurrent: this.maxConcurrentRuns,
    });

    // 立即执行一次
    await this.processSchedules();

    // 启动定时器
    this.timer = setInterval(() => {
      this.processSchedules().catch((error) => {
        logger.error('调度器扫描异常', { error: error.message });
      });
    }, this.scanIntervalMs);
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('工作流调度器已停止');
    }
  }

  /**
   * 扫描并执行到期的调度任务
   */
  private async processSchedules(): Promise<void> {
    if (this.isRunning) {
      logger.debug('调度器忙碌中，跳过本轮扫描');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // 获取到期任务
      const schedules = await this.getSchedulesToRun(this.maxConcurrentRuns);

      if (schedules.length > 0) {
        logger.info(`发现 ${schedules.length} 个到期任务`);

        // 并发执行
        const promises = schedules.map((schedule) => this.executeSchedule(schedule));
        await Promise.allSettled(promises);
      }

      // 处理过期调度
      await this.handleExpiredSchedules();
    } catch (error) {
      logger.error('处理调度任务失败', { error: (error as Error).message });
    } finally {
      this.isRunning = false;
      const duration = Date.now() - startTime;
      logger.debug(`调度器扫描完成，耗时 ${duration}ms`);
    }
  }

  /**
   * 查询到期的调度任务
   */
  private async getSchedulesToRun(limit: number): Promise<WorkflowScheduleEntity[]> {
    return this.dataSource
      .getRepository(WorkflowScheduleEntity)
      .createQueryBuilder('schedule')
      .where('schedule.status = :status', { status: ScheduleStatus.ENABLED })
      .andWhere('schedule.nextRunAt IS NOT NULL')
      .andWhere('schedule.nextRunAt <= :now', { now: new Date() })
      .orderBy('schedule.nextRunAt', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * 执行单个调度任务
   */
  private async executeSchedule(schedule: WorkflowScheduleEntity): Promise<void> {
    logger.info(`执行调度任务`, {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      scheduleType: schedule.scheduleType,
    });

    try {
      // 获取工作流
      const workflow = await this.dataSource
        .getRepository(WorkflowEntity)
        .findOne({ where: { id: schedule.workflowId } });

      if (!workflow) {
        logger.error(`工作流不存在`, {
          workflowId: schedule.workflowId,
          scheduleId: schedule.id,
        });
        return;
      }

      // 构造工作流 AST
      const ast = new WorkflowGraphAst();
      ast.id = workflow.id;
      ast.name = workflow.name;
      ast.description = workflow.description;
      ast.nodes = workflow.nodes;
      ast.edges = workflow.edges;
      ast.entryNodeIds = workflow.entryNodeIds;
      ast.viewport = workflow.viewport;
      ast.collapsed = workflow.collapsed;
      ast.tags = workflow.tags;

      // 合并输入参数（调度参数覆盖默认参数）
      const inputs = {
        ...workflow.defaultInputs,
        ...schedule.inputs,
      };

      logger.info(`开始执行工作流`, {
        workflowName: workflow.name,
        scheduleId: schedule.id,
        inputs,
      });

      // 执行工作流（直接执行，不通过MQ）
      const result = await executeAst(ast, ast as WorkflowGraphAst).toPromise();

      if (result) {
        logger.info(`工作流执行完成`, {
          workflowName: workflow.name,
          scheduleId: schedule.id,
          state: result.state,
        });
      } else {
        logger.warn(`工作流执行无返回结果`, {
          workflowName: workflow.name,
          scheduleId: schedule.id,
        });
      }

      // 更新调度状态
      await this.updateScheduleAfterRun(schedule);
    } catch (error) {
      logger.error(`执行调度任务失败`, {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      // 即使失败，也更新下次执行时间（避免无限重试）
      try {
        await this.updateScheduleAfterRun(schedule);
      } catch (updateError) {
        logger.error(`更新调度状态失败`, {
          scheduleId: schedule.id,
          error: (updateError as Error).message,
        });
      }
    }
  }

  /**
   * 执行后更新调度状态
   */
  private async updateScheduleAfterRun(schedule: WorkflowScheduleEntity): Promise<void> {
    const now = new Date();
    const nextRunAt = this.calculateNextRunTime(schedule);

    // 检查是否过期
    let status = schedule.status;
    if (schedule.endTime && nextRunAt && nextRunAt > schedule.endTime) {
      status = ScheduleStatus.EXPIRED;
      logger.info(`调度任务已过期`, {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        endTime: schedule.endTime,
      });
    }

    // ONCE 类型执行一次后自动禁用
    if (schedule.scheduleType === ScheduleType.ONCE) {
      status = ScheduleStatus.DISABLED;
      logger.info(`一次性调度已完成`, {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
      });
    }

    await this.dataSource.getRepository(WorkflowScheduleEntity).update(schedule.id, {
      lastRunAt: now,
      nextRunAt: status === ScheduleStatus.DISABLED || status === ScheduleStatus.EXPIRED ? undefined : nextRunAt ?? undefined,
      status,
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(schedule: WorkflowScheduleEntity): Date | null {
    const now = new Date();

    // 如果已过期
    if (schedule.endTime && now >= schedule.endTime) {
      return null;
    }

    switch (schedule.scheduleType) {
      case ScheduleType.ONCE:
        // 一次性任务执行后不再执行
        return null;

      case ScheduleType.CRON:
        if (!schedule.cronExpression) {
          logger.error(`Cron 调度缺少表达式`, { scheduleId: schedule.id });
          return null;
        }
        try {
          const interval = CronExpressionParser.parse(schedule.cronExpression, {
            currentDate: now,
          });
          const next = interval.next();
          return next.toDate();
        } catch (error) {
          logger.error(`Cron 表达式解析失败`, {
            scheduleId: schedule.id,
            expression: schedule.cronExpression,
            error: (error as Error).message,
          });
          return null;
        }

      case ScheduleType.INTERVAL:
        if (!schedule.intervalSeconds) {
          logger.error(`间隔调度缺少间隔时间`, { scheduleId: schedule.id });
          return null;
        }
        return new Date(now.getTime() + schedule.intervalSeconds * 1000);

      case ScheduleType.MANUAL:
        // 手动触发不需要下次执行时间
        return null;

      default:
        logger.error(`不支持的调度类型`, {
          scheduleId: schedule.id,
          scheduleType: schedule.scheduleType,
        });
        return null;
    }
  }

  /**
   * 处理过期的调度任务
   */
  private async handleExpiredSchedules(): Promise<void> {
    try {
      const expiredSchedules = await this.dataSource
        .getRepository(WorkflowScheduleEntity)
        .createQueryBuilder('schedule')
        .where('schedule.status = :enabled', { enabled: ScheduleStatus.ENABLED })
        .andWhere('schedule.endTime IS NOT NULL')
        .andWhere('schedule.endTime <= :now', { now: new Date() })
        .getMany();

      if (expiredSchedules.length > 0) {
        logger.info(`发现 ${expiredSchedules.length} 个过期调度`);

        const ids = expiredSchedules.map((s) => s.id);
        await this.dataSource.getRepository(WorkflowScheduleEntity).update(ids, {
          status: ScheduleStatus.EXPIRED,
          nextRunAt: undefined,
        });

        logger.info(`已更新 ${ids.length} 个过期调度状态`);
      }
    } catch (error) {
      logger.error('处理过期调度失败', { error: (error as Error).message });
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; scanning: boolean } {
    return {
      isRunning: this.timer !== null,
      scanning: this.isRunning,
    };
  }
}
