import { Injectable, NoRetryError } from '@sker/core';
import { Handler, setAstError } from '@sker/workflow';
import { CommentNodeAst } from '../nodes/comment-node';
import { WeiboClient } from '../../platforms/weibo/weibo-client';

@Injectable()
export class CommentNodeVisitor {
  constructor(private weiboClient: WeiboClient) {}

  @Handler(CommentNodeAst)
  async visit(ast: CommentNodeAst, ctx: any) {
    ast.state = 'running';

    try {
      if (!ast.postId) {
        throw new NoRetryError('缺少必要参数: postId');
      }

      const comments = await this.weiboClient.getComments(ast.postId, ast.maxComments);
      ast.comments = comments as any[];

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      setAstError(ast, error instanceof Error ? error : new Error(String(error)), process.env.NODE_ENV === 'development');
    }

    return ast;
  }
}
