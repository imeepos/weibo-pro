import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
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
  visit(ast: PostContextCollectorAst, _ctx: any): Observable<INode> {
    return new Observable<INode>(obs => {
      const handler = async () => {
        try {
          ast.state = 'running';
          obs.next({ ...ast });

          if (ast.canStart && ast.canStart.length > 0) {
            const canStart = ast.canStart.every(it => !!it)
            if (!canStart) return;
          }

          // 验证 postId
          if (!ast.postId || ast.postId.trim().length === 0) {
            throw new Error('postId 不能为空');
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
            // 转发表中每条记录的 retweeted_status.id 应该等于原帖的 id
            const reposts = await m
              .createQueryBuilder(WeiboRepostEntity, 'r')
              .where("r.retweeted_status->>'id' = :postId", { postId: String(post.id) })
              .getMany();

            console.log(`[PostContextCollector] 收集到 ${comments.length} 条评论, ${reposts.length} 条转发`);

            ast.post = post;
            ast.comments = comments;
            ast.reposts = reposts;

            ast.state = 'emitting';
            obs.next({ ...ast });
          });

          ast.state = 'success';
          obs.next({ ...ast });
          obs.complete()
        } catch (error) {
          ast.state = 'fail';
          ast.setError(error, process.env.NODE_ENV === 'development');
          console.error(`[PostContextCollectorVisitor] postId: ${ast.postId}`, error);
          obs.next({ ...ast });
          obs.complete()
        }
      };
      handler();
      return () => obs.complete();
    });
  }
}
