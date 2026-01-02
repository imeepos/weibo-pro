import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { EventAst } from '@sker/workflow-ast';
import { useEntityManager, EventEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

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
              relations: ['category', 'tagRelations', 'tagRelations.tag'],
              order: {
                tagRelations: {
                  relevance_score: 'DESC',
                },
              },
            });

            if (!event) {
              throw new Error(`事件不存在: ${ast.eventId}`);
            }

            // 提取关键字
            const keywords = event.tagRelations?.map(relation => relation.tag.name) || [];
            const keywords_str = keywords.join(',');

            ast.event = event;
            ast.event_id = event.id;
            ast.event_title = event.title;
            ast.eventTitle = event.title;
            ast.eventCategory = event.category?.name;
            ast.keywords = keywords;
            ast.keywords_str = keywords_str;

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
              }
            }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
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
