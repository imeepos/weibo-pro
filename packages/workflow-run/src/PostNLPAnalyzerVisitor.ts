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
            if (ast.event_id && typeof ast.nlpResult !== 'string') {
              console.log('[PostNLPAnalyzerVisitor] 开始关联事件，event_id:', ast.event_id, 'postId:', ast.post?.id);
              await this.associatePostWithEvent(ast, ast.nlpResult);
              console.log('[PostNLPAnalyzerVisitor] 事件关联成功');
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
    if (ast.post && ast.post.id && ast.event_id) {
      try {
        await useEntityManager(async (manager) => {
          // 先查询是否已存在
          const existing = await manager.findOne(PostNLPResultEntity, {
            where: { post_id: `${ast.post.id}` }
          });

          if (existing) {
            // 更新现有记录
            await manager.update(
              PostNLPResultEntity,
              { post_id: `${ast.post.id}` },
              {
                event_id: ast.event_id,
                sentiment: nlpResult.sentiment as any,
                keywords: nlpResult.keywords as any,
              }
            );
          } else {
            // 插入新记录
            await manager.insert(PostNLPResultEntity, {
              post_id: `${ast.post.id}`,
              event_id: ast.event_id,
              sentiment: nlpResult.sentiment as any,
              keywords: nlpResult.keywords as any,
              event_type: { type: 'unknown', confidence: 0 } as any, // 提供默认值
            });
          }
          ast.event_associated = true;
        });
      } catch (error: any) {
        console.error('[PostNLPAnalyzerVisitor] ❌ 关联事件失败');
        console.error('  event_id:', ast.event_id);
        console.error('  post_id:', ast.post.id);
        console.error('  错误:', error?.message);
        console.error('  堆栈:', error?.stack);
        throw error; // 重新抛出错误，让外层 catch 处理
      }
    }
  }
}
