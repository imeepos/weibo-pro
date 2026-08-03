import { Injectable, createLogger } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { RecalculateStatisticsAst } from '@sker/workflow-ast';
import { useEntityManager } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import {
  queryPostStats,
  queryCommentStats,
  queryLikeStats,
  queryRepostStats
} from './recalculate-statistics.queries';
import {
  mergeStatistics,
  batchUpsertStatistics,
  calculateTotalStatistics
} from './recalculate-statistics.util';

const logger = createLogger('RecalculateStatisticsVisitor');

@Injectable()
export class RecalculateStatisticsVisitor {
  @Handler(RecalculateStatisticsAst)
  handler(
    ast: RecalculateStatisticsAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      ast.completedSteps = 0;
      ast.errors = [];
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } });

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          if (!ast.eventId) {
            throw new Error('事件ID不能为空');
          }

          logger.info(`[RecalculateStatisticsVisitor] 开始重新计算统计数据，事件ID: ${ast.eventId}`);

          const startDate = ast.startDate || new Date('2000-01-01');
          const endDate = ast.endDate || new Date();

          await this.recalculateStatistics(ast, startDate, endDate, obs, wrappedCtx);

          return [{
            type: 'node_emit' as const,
            id: ast.id,
            data: {
              outputEventId: ast.outputEventId,
              totalHours: ast.totalHours,
              processedHours: ast.processedHours,
              statistics: ast.statistics,
              success: ast.success
            }
          }];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          logger.error(`[RecalculateStatisticsVisitor] 执行失败:`, error);
          ast.state = 'fail';
          ast.success = false;
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  private async recalculateStatistics(
    ast: RecalculateStatisticsAst,
    startDate: Date,
    endDate: Date,
    obs: any,
    _ctx: { abortSignal?: AbortSignal }
  ): Promise<void> {
    const steps = [
      '清空现有数据',
      '计算帖子统计',
      '计算评论统计',
      '计算点赞统计',
      '计算转发统计',
      '计算NLP统计',
      '合并统计数据'
    ];

    ast.totalSteps = steps.length;
    ast.outputEventId = ast.eventId;

    await useEntityManager(async (manager) => {
      if (ast.clearExisting) {
        ast.currentStep = steps[0]!;
        ast.completedSteps = 0;
        ast.progress = 0 / ast.totalSteps;
        this.emitProgress(ast, obs);

        logger.info(`[RecalculateStatisticsVisitor] 清空现有统计数据`);
        await manager.query(
          `DELETE FROM event_hourly_statistics WHERE event_id = $1`,
          [ast.eventId]
        );

        ast.completedSteps = 1;
        ast.progress = 1 / ast.totalSteps;
        this.emitProgress(ast, obs);
      }

      ast.currentStep = steps[1]!;
      this.emitProgress(ast, obs);

      const postStats = await queryPostStats(manager, ast.eventId, startDate, endDate);
      logger.info(`[RecalculateStatisticsVisitor] 帖子统计: ${postStats.length} 个小时`);
      ast.completedSteps = 2;
      ast.progress = 2 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[2]!;
      this.emitProgress(ast, obs);

      const commentStats = await queryCommentStats(manager, ast.eventId, startDate, endDate);
      logger.info(`[RecalculateStatisticsVisitor] 评论统计: ${commentStats.length} 个小时`);
      ast.completedSteps = 3;
      ast.progress = 3 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[3]!;
      this.emitProgress(ast, obs);

      const likeStats = await queryLikeStats(manager, ast.eventId, startDate, endDate);
      logger.info(`[RecalculateStatisticsVisitor] 点赞统计: ${likeStats.length} 个小时`);
      ast.completedSteps = 4;
      ast.progress = 4 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[4]!;
      this.emitProgress(ast, obs);

      const repostStats = await queryRepostStats(manager, ast.eventId, startDate, endDate);
      logger.info(`[RecalculateStatisticsVisitor] 转发统计: ${repostStats.length} 个小时`);
      ast.completedSteps = 5;
      ast.progress = 5 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[5]!;
      ast.completedSteps = 6;
      ast.progress = 6 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[6]!;
      this.emitProgress(ast, obs);

      const allStats = mergeStatistics(postStats, commentStats, likeStats, repostStats);
      logger.info(`[RecalculateStatisticsVisitor] 合并后共 ${allStats.length} 个小时的统计数据`);

      await batchUpsertStatistics(manager, allStats, ast.batchSize);

      const totalStats = calculateTotalStatistics(allStats);
      ast.statistics = totalStats;
      ast.totalHours = allStats.length;
      ast.processedHours = allStats.length;
      ast.success = true;

      ast.completedSteps = 7;
      ast.progress = 1;
      this.emitProgress(ast, obs);

      logger.info(`[RecalculateStatisticsVisitor] 重新计算完成`);
    });
  }

  private emitProgress(ast: RecalculateStatisticsAst, obs: any) {
    obs.next({
      type: 'node_emit',
      id: ast.id,
      data: {
        currentStep: ast.currentStep,
        completedSteps: ast.completedSteps,
        totalSteps: ast.totalSteps,
        progress: ast.progress
      }
    });
  }
}
