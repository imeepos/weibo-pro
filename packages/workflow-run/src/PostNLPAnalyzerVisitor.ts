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
          setAstError(ast, error);
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
    if (ast.post && ast.post.id && ast.event_id) {
      await useEntityManager(async (manager) => {
        await manager.upsert(
          PostNLPResultEntity,
          {
            post_id: `${ast.post.id}`,
            event_id: ast.event_id,
            sentiment: nlpResult.sentiment as any,
            keywords: nlpResult.keywords as any,
          },
          ['post_id']
        );
        ast.event_associated = true;
      });
    }
  }
}
