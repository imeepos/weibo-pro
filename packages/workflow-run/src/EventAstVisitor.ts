import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { EventAst } from '@sker/workflow-ast';
import { useEntityManager, EventEntity, WeiboPostEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

@Injectable()
export class EventAstVisitor {
  @Handler(EventAst)
  handler(ast: EventAst, input$: Observable<Record<string, unknown>>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      ast.count += 1;
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

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          if (!ast.eventId) {
            throw new Error('请选择事件');
          }

          await useEntityManager(async (manager) => {
            const event = await manager.findOne(EventEntity, {
              where: { id: ast.eventId },
              relations: ['category'],
            });

            if (!event) {
              console.warn(`[EventAstVisitor] 事件不存在，跳过处理: ${ast.eventId}`);
              // 事件不存在时直接 complete，不传递任何数据给下游节点
              ast.state = 'success';
              return [];
            }

            // 提取关键字（直接从 keywords 字段）
            const keywords = event.keywords || [];
            const keywords_str = keywords.join(' ');

            // 查询帖子时间区间
            const timeRange = await manager
              .createQueryBuilder(WeiboPostEntity, 'post')
              .select('MIN(post.created_at)', 'min')
              .addSelect('MAX(post.created_at)', 'max')
              .where('post.event_id = :eventId', { eventId: ast.eventId })
              .andWhere('post.created_at IS NOT NULL')
              .getRawOne<{ min: Date; max: Date }>();

            // 计算帖子时间区间
            const post_min_time = timeRange?.min ? timeRange.min.toISOString() : '';
            const post_max_time = timeRange?.max ? timeRange.max.toISOString() : '';
            event.crawl_end_reason = event.crawl_end_reason || 'null'
            let is_crawl_complete = event.crawl_end_reason === 'null' ? false : true;

            ast.event = event;
            ast.event_id = event.id;
            ast.event_title = event.title;
            ast.eventTitle = event.title;
            ast.eventCategory = event.category?.name;
            ast.keywords = keywords;
            ast.keywords_str = keywords_str;
            ast.crawl_end_reason = event.crawl_end_reason
            // 优先使用 occurred_at，为 null 时使用 created_at
            const eventTime = event.occurred_at || event.created_at;
            if (eventTime) {
              ast.startTime = eventTime.toISOString();
            }
            ast.post_min_time = post_min_time;
            ast.post_max_time = post_max_time;
            ast.is_crawl_complete = is_crawl_complete;

            obs.next({ type: 'node_runing', id: ast.id });
          });

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                event: ast.event,
                event_id: ast.event_id,
                event_title: ast.event_title,
                keywords: ast.keywords,
                keywords_str: ast.keywords_str,
                startTime: ast.startTime,
                post_min_time: ast.post_min_time,
                post_max_time: ast.post_max_time,
                is_crawl_complete: ast.is_crawl_complete
              }
            }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[EventAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[EventAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          // 发射包含 null 的数据事件，让下游节点可以继续处理
          obs.next({
            type: 'node_emit',
            id: ast.id,
            data: {
              event: null,
              event_id: null,
              event_title: null,
              keywords: null,
              keywords_str: null,
            }
          });
          obs.complete();
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
}
