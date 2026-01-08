import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import {
  useEntityManager,
  WeiboCommentEntity,
  WeiboPostEntity,
  WeiboRepostEntity,
} from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { ErrorHandlerOperators } from './utils/error-handler.util';

@Injectable()
export class PostContextCollectorVisitor {
  @Handler(PostContextCollectorAst)
  visit(ast: PostContextCollectorAst, input$: Observable<Record<string, unknown>>, ctx: Record<string, unknown>): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      const abortController = new AbortController();

      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      ast.state = 'running';
      ast.count += 1;
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

          if (ast.canStart && ast.canStart.length > 0) {
            const canStart = ast.canStart.every(it => !!it)
            if (!canStart) return [];
          }

          // 验证 postId - 如果为空则返回空数组（上游节点可能失败）
          if (!ast.postId || String(ast.postId).trim().length === 0) {
            console.warn(`[PostContextCollector] postId 为空，跳过处理`);
            return [];
          }

          // 检查取消信号（数据库操作前）
          if (wrappedCtx.abortSignal?.aborted) {
            throw new Error('工作流已取消');
          }

          await useEntityManager(async (m) => {
            // 确保 postId 是字符串
            const postIdStr = String(ast.postId);

            // 优化查询逻辑：id 通常是 16-19 位的长数字，mblogid 通常较短
            const isLongId = /^\d{16,}$/.test(postIdStr);
            const firstQuery = isLongId ? 'id' : 'mblogid';

            let post = await m.findOne(WeiboPostEntity, {
              where: isLongId ? { id: postIdStr } : { mblogid: postIdStr },
            });

            // 如果第一次查询失败，尝试另一种方式
            if (!post && !isLongId) {
              console.log(`[PostContextCollector] ${firstQuery} 查询失败，尝试使用 id 查询`);
              post = await m.findOne(WeiboPostEntity, {
                where: { id: postIdStr },
              });
            }

            if (!post) {
              console.error(`[PostContextCollector] 查询失败，postId=${postIdStr}, 尝试的字段: ${firstQuery}`);
              throw new Error(`Post not found: ${postIdStr}`);
            }

            const comments = await m.find(WeiboCommentEntity, {
              where: { rootid: Number(post.id) },
              order: { like_counts: 'DESC' },
            });

            // 转发需要通过 retweeted_status 的 id 来匹配
            const reposts = await m
              .createQueryBuilder(WeiboRepostEntity, 'r')
              .where("r.retweeted_status->>'id' = :postId", { postId: String(post.id) })
              .getMany();

            ast.post = post;
            ast.comments = comments;
            ast.reposts = reposts;
            ast.event_id = post.event_id || '';
          });

          return [
            { type: 'node_emit' as const, id: ast.id, data: { post: ast.post, comments: ast.comments, reposts: ast.reposts, event_id: ast.event_id } }
          ];
        }),
        ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[PostContextCollectorVisitor]' }),
        ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[PostContextCollectorVisitor]' }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          console.log('[PostContextCollectorVisitor] subscribe.next 发射事件，emitCount:', ast.emitCount);
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[PostContextCollectorVisitor] postId: ${ast.postId}`, error);
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
