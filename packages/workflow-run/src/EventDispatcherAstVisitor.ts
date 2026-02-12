import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { EventDispatcherAst } from '@sker/workflow-ast';
import { useEntityManager, EventEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

@Injectable()
export class EventDispatcherAstVisitor {
  @Handler(EventDispatcherAst)
  handler(
    ast: EventDispatcherAst,
    input$: Observable<Record<string, unknown>>,
    ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      interface WrappedContext extends Record<string, unknown> {
        abortSignal: AbortSignal;
      }

      const wrappedCtx: WrappedContext = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
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

          // 查询所有事件（只查询 last_crawl_at 为 null 或超过1小时的）
          const oneHoursAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          const events = await useEntityManager(async (manager) => {
            return await manager
              .createQueryBuilder(EventEntity, 'event')
              .leftJoinAndSelect('event.category', 'category')
              .where('event.status = :status', { status: 'active' })
              .andWhere('(event.last_crawl_at IS NULL OR event.last_crawl_at < :oneHoursAgo)', { oneHoursAgo })
              .orderBy('event.last_crawl_at', 'ASC', 'NULLS FIRST')  // 从未爬取的排最前（null），然后是最早爬取的
              .addOrderBy('event.updated_at', 'ASC')       // 辅助排序：更新时间早的优先
              .addOrderBy('event.created_at', 'DESC')      // 辅助排序：创建时间晚的优先
              .limit(10)
              .getMany();
          });

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          if (events.length === 0) {
            throw new Error('没有可用的事件：所有事件的 keyword 都为空，或者没有 active 状态的事件');
          }

          // 应用 limit
          const limitedEvents = ast.limit > 0 ? events.slice(0, ast.limit) : events;

          // 更新统计信息
          ast.totalEvents = events.length;
          ast.uncrawledCount = events.filter(e => !e.crawl_end_reason).length;

          // === 简化核心：直接选择第一个事件 ===
          const selectedEvent = limitedEvents[0];
          if (!selectedEvent) {
            throw new Error('没有可选中事件');
          }
          const selectedEventId = selectedEvent.id;

          // 更新 AST 输出
          ast.selectedEventId = selectedEventId;
          ast.selectedEvent = selectedEvent;
          ast.eventsList = limitedEvents;

          console.log(`[EventDispatcherAstVisitor] 选中事件: ${selectedEvent.title} (${selectedEventId})`);

          // 更新 last_crawl_at 实现轮换
          await useEntityManager(async m => {
            await m.update(EventEntity, selectedEventId, {
              last_crawl_at: new Date()
            } as any);
          });

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                selectedEventId,
                selectedEvent,
                eventsList: limitedEvents
              }
            }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[EventDispatcherAstVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[EventDispatcherAstVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          console.error(`[EventDispatcherAstVisitor] 执行失败:`, error);
          ast.state = 'fail';
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
}
