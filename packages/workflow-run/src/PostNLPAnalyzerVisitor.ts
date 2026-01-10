import { Inject, Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import {
  PostNLPResultEntity,
  PostProcessFlags,
  useEntityManager,
  WeiboPostEntity,
  HourlyStatisticsHelper,
} from '@sker/entities';
import { NLPAnalyzer } from '@sker/nlp';
import type { PostContext, CompleteAnalysisResult } from '@sker/nlp';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap, tap } from 'rxjs/operators';

@Injectable()
export class PostNLPAnalyzerVisitor {

  constructor(@Inject(NLPAnalyzer) private analyzer: NLPAnalyzer) { }

  @Handler(PostNLPAnalyzerAst)
  visit(ast: PostNLPAnalyzerAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
    console.log('[PostNLPAnalyzerVisitor] visit 被调用，节点ID:', ast.id);

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
      ast.failedCount = 0;
      ast.errors = [];
      obs.next({ type: 'node_runing', id: ast.id });

      console.log('[PostNLPAnalyzerVisitor] 开始订阅 input$，节点ID:', ast.id);

      const subscription = input$.pipe(
        tap({
          next: (data) => console.log('[PostNLPAnalyzerVisitor] input$ 发射数据:', Object.keys(data)),
          complete: () => console.log('[PostNLPAnalyzerVisitor] input$ 完成')
        }),
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          console.log('[PostNLPAnalyzerVisitor] concatMap 接收到数据，第', ast.emitCount, '次，postId:', (inputData as any)?.post?.id);
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })

          try {
            if (inputData) {
              Object.keys(inputData).forEach(key => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
              });
            }

            if (wrappedCtx.abortSignal?.aborted) {
              throw new Error('工作流已取消');
            }

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
              postId: ast.post?.id,
              content: ast.post?.text_raw,
              comments: ast.comments.map((c) => c.text_raw),
              subComments,
              reposts: ast.reposts.map((r) => r.text),
            };
            ast.nlpResult = await this.analyzer.analyze(
              context,
            );
            console.log('[PostNLPAnalyzerVisitor] NLP 分析成功，第', ast.emitCount, '次，postId:', ast.post?.id);
            if (typeof ast.nlpResult !== 'string') {
              console.log('[PostNLPAnalyzerVisitor] 开始保存 NLP 结果，event_id:', ast.event_id, 'postId:', ast.post?.id);
              await this.saveNLPResult(ast, ast.nlpResult);
              console.log('[PostNLPAnalyzerVisitor] NLP 结果保存成功');
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
          } catch (error: any) {
            // 记录失败但不抛出，让流继续
            console.error('[PostNLPAnalyzerVisitor] ❌ NLP 分析失败，第', ast.emitCount, '次');
            console.error('  postId:', ast.post?.id);
            console.error('  错误类型:', error?.constructor?.name);
            console.error('  错误消息:', error?.message);
            console.error('  错误堆栈:', error?.stack);
            ast.failedCount = (ast.failedCount || 0) + 1;
            ast.errors = ast.errors || [];
            ast.errors.push({
              postId: ast.post?.id,
              error: error?.message || String(error)
            });

            return [
              {
                type: 'node_emit' as const,
                id: ast.id,
                data: {
                  error: error?.message || String(error),
                  postId: ast.post?.id,
                  emitCount: ast.emitCount,
                  failedCount: ast.failedCount
                }
              }
            ];
          }
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          console.log('[PostNLPAnalyzerVisitor] subscribe.next 接收到事件:', event.type, '数据:', JSON.stringify((event as any).data || {}).substring(0, 100));
          obs.next(event);
        },
        error: (error) => {
          console.log('[PostNLPAnalyzerVisitor] subscribe.error 捕获到错误:', error?.message || error);
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
        },
        complete: () => {
          console.log('[PostNLPAnalyzerVisitor] subscribe.complete 被调用，failedCount:', ast.failedCount, 'emitCount:', ast.emitCount);
          const failureRate = ast.emitCount > 0 ? (ast.failedCount || 0) / ast.emitCount : 0;
          if (failureRate > 0.5) {
            ast.state = 'fail';
            setAstError(ast, new Error(`${ast.failedCount} 个帖子分析失败 (失败率: ${(failureRate * 100).toFixed(1)}%)`));
            obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          } else {
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id });
          }
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

  private async saveNLPResult(
    ast: PostNLPAnalyzerAst,
    nlpResult: CompleteAnalysisResult
  ): Promise<void> {
    if (!ast.post?.id) return;

    try {
      await useEntityManager(async (manager) => {
        const postId = `${ast.post.id}`;

        // 如果 ast 没有 event_id，从 post 表中获取
        let eventId: string | null | undefined = ast.event_id;
        if (!eventId) {
          const post = await manager.findOne(WeiboPostEntity, {
            where: { id: postId },
            select: ['event_id']
          });
          eventId = post?.event_id;
        }

        const existing = await manager.findOne(PostNLPResultEntity, {
          where: { post_id: postId }
        });

        if (existing) {
          await manager.update(
            PostNLPResultEntity,
            { post_id: postId },
            {
              event_id: eventId ?? null,
              sentiment: nlpResult.sentiment as any,
              keywords: nlpResult.keywords as any,
            }
          );
        } else {
          await manager.insert(PostNLPResultEntity, {
            post_id: postId,
            event_id: eventId ?? null,
            sentiment: nlpResult.sentiment as any,
            keywords: nlpResult.keywords as any,
            event_type: { type: 'unknown', confidence: 0 } as any,
          });
        }

        // 入库后触发小时统计
        if (eventId && nlpResult.sentiment) {
          const post = await manager.findOne(WeiboPostEntity, {
            where: { id: postId },
            select: ['created_at']
          });

          if (post?.created_at) {
            const postTime = new Date(post.created_at);
            const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

            await HourlyStatisticsHelper.upsertNLPStatisticsIncremental(
              manager,
              eventId,
              timeDimensions,
              nlpResult.sentiment
            );
          }
        }

        await manager
          .createQueryBuilder()
          .update(WeiboPostEntity)
          .set({
            process_flags: () => `process_flags | ${PostProcessFlags.NLP_COMPLETED}`,
          })
          .where('id = :id', { id: postId })
          .execute();

        ast.event_associated = !!eventId;
      });
    } catch (error: any) {
      console.error('[PostNLPAnalyzerVisitor] ❌ 保存 NLP 结果失败');
      console.error('  event_id:', ast.event_id);
      console.error('  post_id:', ast.post.id);
      console.error('  错误:', error?.message);
      console.error('  堆栈:', error?.stack);
      throw error;
    }
  }
}
