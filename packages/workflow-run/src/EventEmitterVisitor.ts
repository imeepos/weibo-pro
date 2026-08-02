import { Injectable, createLogger } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { EventEmitterAst } from '@sker/workflow-ast';
import { useEntityManager } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap, delay } from 'rxjs/operators';

const logger = createLogger('EventEmitterVisitor');

interface EventRecord {
  id: string;
  title: string;
}

@Injectable()
export class EventEmitterVisitor {
  @Handler(EventEmitterAst)
  handler(
    ast: EventEmitterAst,
    input$: Observable<Record<string, unknown>>,
    _ctx: Record<string, unknown>
  ): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async () => {
          const events = await this.fetchEvents();
          ast.totalEvents = events.length;
          ast.total = events.length;

          logger.info(`[EventEmitterVisitor] 查询到 ${events.length} 个事件`);

          return events;
        }),
        mergeMap((events: EventRecord[]) => from(events)),
        concatMap((event: EventRecord, index: number) =>
          from([event]).pipe(
            delay(ast.delay),
            mergeMap(async (e) => {
              ast.currentIndex = index;
              ast.processedEvents = index + 1;
              ast.progress = (index + 1) / ast.totalEvents;
              ast.eventId = e.id;
              ast.eventTitle = e.title;
              ast.index = index;
              ast.isLast = index === ast.totalEvents - 1;

              logger.info(`[EventEmitterVisitor] 发射事件 [${index + 1}/${ast.totalEvents}]: ${e.title}`);

              return {
                type: 'node_emit' as const,
                id: ast.id,
                data: {
                  eventId: e.id,
                  eventTitle: e.title,
                  index,
                  total: ast.totalEvents,
                  isLast: ast.isLast
                }
              };
            })
          )
        )
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          logger.error(`[EventEmitterVisitor] 执行失败:`, error);
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

  private async fetchEvents(): Promise<EventRecord[]> {
    return useEntityManager(async (manager) => {
      const events = await manager.query(`
        SELECT id, title
        FROM events
        WHERE deleted_at IS NULL
          AND status = 'active'
        ORDER BY created_at DESC
      `);

      return events;
    });
  }
}
