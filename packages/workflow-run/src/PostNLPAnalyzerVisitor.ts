import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import {
  EventCategoryEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';
import { NLPAnalyzer } from '@sker/nlp';
import type { PostContext, CompleteAnalysisResult } from '@sker/nlp';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';

@Injectable()
export class PostNLPAnalyzerVisitor {

  constructor(@Inject(NLPAnalyzer) private analyzer: NLPAnalyzer) { }

  @Handler(PostNLPAnalyzerAst)
  visit(ast: PostNLPAnalyzerAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
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
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          const { availableCategories, availableTags, recentEvents } = await useEntityManager(async (m) => {
            const categories = await m.find(EventCategoryEntity, {
              where: { status: 'active' },
              order: { sort: 'ASC' },
            });

            interface TagResult {
              name: string;
            }

            interface EventResult {
              title: string;
              description: string;
              hotness?: number;
              occurred_at?: Date;
            }

            const tags = await m.query<TagResult[]>(`
              SELECT name FROM event_tags
              WHERE deleted_at IS NULL
              ORDER BY usage_count DESC
              LIMIT 200
            `);

            // 查询最近30天内的活跃事件，按热度和时间排序
            const events = await m.query<EventResult[]>(`
              SELECT
                e.title,
                e.description,
                e.hotness,
                e.occurred_at
              FROM events e
              WHERE e.status = 'active'
                AND e.occurred_at >= NOW() - INTERVAL '30 days'
              ORDER BY e.hotness DESC, e.occurred_at DESC
              LIMIT 100
            `);

            return {
              availableCategories: categories.map((c) => c.name),
              availableTags: tags.map((t) => t.name),
              recentEvents: events.map((e) => ({
                title: e.title,
                description: e.description,
              })),
            };
          });

          interface SubComment {
            text_raw?: string;
            text?: string;
          }

          interface Comment extends SubComment {
            comments?: SubComment[];
          }

          const subComments = (ast.comments as Comment[])
            .flatMap((c) => c.comments || [])
            .map((sc) => sc.text_raw || sc.text)
            .filter(Boolean) as string[];

          const context: PostContext = {
            postId: ast.post.id,
            content: ast.post.text_raw,
            comments: ast.comments.map((c) => c.text_raw),
            subComments,
            reposts: ast.reposts.map((r) => r.text),
          };

          console.log(`[PostNLPAnalyzer] postId=${ast.post.id}, 内容统计:`, {
            postLength: context.content?.length || 0,
            commentsCount: context.comments.length,
            commentsChars: context.comments.join('').length,
            subCommentsCount: context.subComments.length,
            subCommentsChars: context.subComments.join('').length,
            repostsCount: context.reposts.length,
            repostsChars: context.reposts.join('').length,
          });

          ast.nlpResult = await this.analyzer.analyze(
            context,
            availableCategories,
            availableTags,
            recentEvents
          );

          if (ast.event_id && typeof ast.nlpResult !== 'string') {
            await this.associatePostWithEvent(ast, ast.nlpResult);
          }

          return [
            {
              type: 'node_emit' as const,
              id: ast.id,
              data: {
                nlpResult: ast.nlpResult,
                event_associated: ast.event_associated,
              }
            }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => obs.next(event),
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[PostNLPAnalyzerVisitor] postId: ${ast.post.id}`, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        console.log('[PostNLPAnalyzerVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  private async associatePostWithEvent(
    ast: PostNLPAnalyzerAst,
    nlpResult: CompleteAnalysisResult
  ): Promise<void> {
    await useEntityManager(async (manager) => {
      await manager.upsert(
        PostNLPResultEntity,
        {
          post_id: `${ast.post.id}`,
          event_id: ast.event_id,
          sentiment: nlpResult.sentiment as any,
          keywords: nlpResult.keywords as any,
          event_type: nlpResult.event,
        },
        ['post_id']
      );

      ast.event_associated = true;

      console.log(
        `[PostNLPAnalyzer] 帖子 ${ast.post.id} 已关联事件 ${ast.event_id}`
      );
    });
  }
}
