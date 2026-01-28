import { Injectable, createLogger } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { RecalculateStatisticsAst } from '@sker/workflow-ast';
import { useEntityManager } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

const logger = createLogger('RecalculateStatisticsVisitor');

interface HourlyStats {
  event_id: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  post_count?: number;
  comment_count?: number;
  like_count?: number;
  repost_count?: number;
  user_count?: number;
}

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
    ctx: { abortSignal?: AbortSignal }
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

      const postStats = await manager.query(`
        SELECT
          event_id,
          EXTRACT(YEAR FROM created_at)::int as year,
          EXTRACT(MONTH FROM created_at)::int as month,
          EXTRACT(DAY FROM created_at)::int as day,
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::int as post_count,
          COUNT(DISTINCT user_id)::int as user_count
        FROM weibo_posts
        WHERE event_id = $1
          AND created_at >= $2
          AND created_at < $3
        GROUP BY event_id, year, month, day, hour
      `, [ast.eventId, startDate, endDate]);

      logger.info(`[RecalculateStatisticsVisitor] 帖子统计: ${postStats.length} 个小时`);
      ast.completedSteps = 2;
      ast.progress = 2 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[2]!;
      this.emitProgress(ast, obs);

      const commentStats = await manager.query(`
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM c.created_at)::int as year,
          EXTRACT(MONTH FROM c.created_at)::int as month,
          EXTRACT(DAY FROM c.created_at)::int as day,
          EXTRACT(HOUR FROM c.created_at)::int as hour,
          COUNT(*)::int as comment_count,
          COUNT(DISTINCT c.user_id)::int as user_count
        FROM weibo_comments c
        JOIN weibo_posts p ON c.post_id = p.id
        WHERE p.event_id = $1
          AND c.created_at >= $2
          AND c.created_at < $3
        GROUP BY p.event_id, year, month, day, hour
      `, [ast.eventId, startDate, endDate]);

      logger.info(`[RecalculateStatisticsVisitor] 评论统计: ${commentStats.length} 个小时`);
      ast.completedSteps = 3;
      ast.progress = 3 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[3]!;
      this.emitProgress(ast, obs);

      const likeStats = await manager.query(`
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM p.created_at)::int as year,
          EXTRACT(MONTH FROM p.created_at)::int as month,
          EXTRACT(DAY FROM p.created_at)::int as day,
          EXTRACT(HOUR FROM p.created_at)::int as hour,
          COUNT(*)::int as like_count,
          COUNT(DISTINCT l.user_weibo_id)::int as user_count
        FROM weibo_likes l
        JOIN weibo_posts p ON l.target_weibo_id = p.id
        WHERE p.event_id = $1
          AND p.created_at >= $2
          AND p.created_at < $3
        GROUP BY p.event_id, year, month, day, hour
      `, [ast.eventId, startDate, endDate]);

      logger.info(`[RecalculateStatisticsVisitor] 点赞统计: ${likeStats.length} 个小时`);
      ast.completedSteps = 4;
      ast.progress = 4 / ast.totalSteps;
      this.emitProgress(ast, obs);

      ast.currentStep = steps[4]!;
      this.emitProgress(ast, obs);

      const repostStats = await manager.query(`
        SELECT
          p.event_id,
          EXTRACT(YEAR FROM r.created_at)::int as year,
          EXTRACT(MONTH FROM r.created_at)::int as month,
          EXTRACT(DAY FROM r.created_at)::int as day,
          EXTRACT(HOUR FROM r.created_at)::int as hour,
          COUNT(*)::int as repost_count,
          COUNT(DISTINCT r.user_id)::int as user_count
        FROM weibo_reposts r
        JOIN weibo_posts p ON r.post_id = p.id
        WHERE p.event_id = $1
          AND r.created_at >= $2
          AND r.created_at < $3
        GROUP BY p.event_id, year, month, day, hour
      `, [ast.eventId, startDate, endDate]);

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

      const allStats = this.mergeStatistics(postStats, commentStats, likeStats, repostStats);
      logger.info(`[RecalculateStatisticsVisitor] 合并后共 ${allStats.length} 个小时的统计数据`);

      await this.batchUpsertStatistics(manager, allStats, ast.batchSize);

      const totalStats = this.calculateTotalStatistics(allStats);
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

  private mergeStatistics(...statsArrays: HourlyStats[][]): HourlyStats[] {
    const statsMap = new Map<string, HourlyStats>();

    for (const statsArray of statsArrays) {
      for (const stat of statsArray) {
        const key = `${stat.event_id}_${stat.year}_${stat.month}_${stat.day}_${stat.hour}`;
        const existing = statsMap.get(key);

        if (existing) {
          existing.post_count = (existing.post_count || 0) + (stat.post_count || 0);
          existing.comment_count = (existing.comment_count || 0) + (stat.comment_count || 0);
          existing.like_count = (existing.like_count || 0) + (stat.like_count || 0);
          existing.repost_count = (existing.repost_count || 0) + (stat.repost_count || 0);
          existing.user_count = (existing.user_count || 0) + (stat.user_count || 0);
        } else {
          statsMap.set(key, { ...stat });
        }
      }
    }

    return Array.from(statsMap.values());
  }

  private async batchUpsertStatistics(
    manager: any,
    stats: HourlyStats[],
    batchSize: number
  ): Promise<void> {
    for (let i = 0; i < stats.length; i += batchSize) {
      const batch = stats.slice(i, i + batchSize);

      for (const stat of batch) {
        const hotness = (stat.post_count || 0) * 1 + (stat.comment_count || 0) * 2 + (stat.repost_count || 0) * 3 + (stat.like_count || 0) * 0.5;

        await manager.query(`
          INSERT INTO event_hourly_statistics (
            event_id, year, month, day, hour,
            post_count, comment_count, like_count, repost_count, user_count, hotness
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (event_id, year, month, day, hour)
          DO UPDATE SET
            post_count = EXCLUDED.post_count,
            comment_count = EXCLUDED.comment_count,
            like_count = EXCLUDED.like_count,
            repost_count = EXCLUDED.repost_count,
            user_count = EXCLUDED.user_count,
            hotness = EXCLUDED.hotness,
            updated_at = CURRENT_TIMESTAMP
        `, [
          stat.event_id,
          stat.year,
          stat.month,
          stat.day,
          stat.hour,
          stat.post_count || 0,
          stat.comment_count || 0,
          stat.like_count || 0,
          stat.repost_count || 0,
          stat.user_count || 0,
          hotness
        ]);
      }
    }
  }

  private calculateTotalStatistics(stats: HourlyStats[]) {
    return stats.reduce((acc, stat) => ({
      postCount: acc.postCount + (stat.post_count || 0),
      commentCount: acc.commentCount + (stat.comment_count || 0),
      likeCount: acc.likeCount + (stat.like_count || 0),
      repostCount: acc.repostCount + (stat.repost_count || 0),
      uniqueUserCount: acc.uniqueUserCount + (stat.user_count || 0)
    }), {
      postCount: 0,
      commentCount: 0,
      likeCount: 0,
      repostCount: 0,
      uniqueUserCount: 0
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
