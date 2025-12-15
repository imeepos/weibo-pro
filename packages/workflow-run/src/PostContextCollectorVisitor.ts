import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import {
  useEntityManager,
  WeiboCommentEntity,
  WeiboPostEntity,
  WeiboRepostEntity,
} from '@sker/entities';
import { Observable } from 'rxjs';

@Injectable()
export class PostContextCollectorVisitor {
  @Handler(PostContextCollectorAst)
  visit(ast: PostContextCollectorAst, ctx: any): Observable<NodeEvent> {
    return new Observable<NodeEvent>(obs => {
      // 创建专门的 AbortController
      const abortController = new AbortController();

      // 包装 ctx
      const wrappedCtx = {
        ...ctx,
        abortSignal: abortController.signal
      };

      const handler = async () => {
        try {
          // 检查取消信号
          if (wrappedCtx.abortSignal?.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ type: 'node_fail', id: ast.id, data: ast });
            return;
          }

          ast.state = 'running';
          ast.count += 1;
          obs.next({ type: 'node_runing', id: ast.id, data: ast });

          if (ast.canStart && ast.canStart.length > 0) {
            const canStart = ast.canStart.every(it => !!it)
            if (!canStart) return;
          }

          // 验证 postId
          if (!ast.postId || ast.postId.trim().length === 0) {
            throw new Error('postId 不能为空');
          }

          // 检查取消信号（数据库操作前）
          if (wrappedCtx.abortSignal?.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ type: 'node_fail', id: ast.id, data: ast });
            return;
          }

          await useEntityManager(async (m) => {
            const isNumeric = /^\d+$/.test(ast.postId);
            const post = await m.findOne(WeiboPostEntity, {
              where: isNumeric ? { id: ast.postId } : { mblogid: ast.postId },
            });

            if (!post) {
              throw new Error(`Post not found: ${ast.postId}`);
            }

            console.log(`[PostContextCollector] 收集 post.id=${post.id}, post.mblogid=${post.mblogid}`);

            const comments = await m.find(WeiboCommentEntity, {
              where: { rootid: Number(post.id) },
              order: { like_counts: 'DESC' },
            });

            // 转发需要通过 retweeted_status 的 id 来匹配
            const reposts = await m
              .createQueryBuilder(WeiboRepostEntity, 'r')
              .where("r.retweeted_status->>'id' = :postId", { postId: String(post.id) })
              .getMany();

            console.log(`[PostContextCollector] 收集到 ${comments.length} 条评论, ${reposts.length} 条转发`);

            ast.post = post;
            ast.comments = comments;
            ast.reposts = reposts;
            obs.next({ type: 'node_emit', id: ast.id, property: 'post', value: ast.post });
            obs.next({ type: 'node_emit', id: ast.id, property: 'comments', value: ast.comments });
            obs.next({ type: 'node_emit', id: ast.id, property: 'reposts', value: ast.reposts });
          });

          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id, data: ast });
          obs.complete()
        } catch (error) {
          ast.state = 'fail';
          setAstError(ast, error, process.env.NODE_ENV === 'development');
          console.error(`[PostContextCollectorVisitor] postId: ${ast.postId}`, error);
          obs.next({ type: 'node_fail', id: ast.id, data: ast });
          obs.complete()
        }
      };
      handler();

      // 返回清理函数
      return () => {
        console.log('[PostContextCollectorVisitor] 订阅被取消，触发 AbortSignal');
        abortController.abort();
        obs.complete();
      };
    });
  }
}
