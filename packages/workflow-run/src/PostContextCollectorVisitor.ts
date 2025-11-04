import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import {
  useEntityManager,
  WeiboCommentEntity,
  WeiboPostEntity,
  WeiboRepostEntity,
} from '@sker/entities';

@Injectable()
export class PostContextCollectorVisitor {
  @Handler(PostContextCollectorAst)
  async visit(ast: PostContextCollectorAst, _ctx: any) {
    ast.state = 'running';

    try {
      await useEntityManager(async (m) => {
        const post = await m.findOne(WeiboPostEntity, {
          where: { id: ast.postId },
        });

        if (!post) {
          throw new Error(`Post not found: ${ast.postId}`);
        }

        const comments = await m.find(WeiboCommentEntity, {
          where: { rootid: BigInt(ast.postId) as any },
          order: { like_counts: 'DESC' },
        });

        const reposts = await m.find(WeiboRepostEntity, {
          where: { id: BigInt(ast.postId) as any },
        });

        ast.post = post;
        ast.comments = comments;
        ast.reposts = reposts;
      });

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.error = error as Error;
      console.error(`[PostContextCollectorVisitor] postId: ${ast.postId}`, error);
    }

    return ast;
  }
}
