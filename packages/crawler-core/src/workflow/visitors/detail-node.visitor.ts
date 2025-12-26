import { Injectable, NoRetryError } from '@sker/core';
import { Handler, setAstError } from '@sker/workflow';
import { DetailNodeAst } from '../nodes/detail-node';
import { WeiboClient } from '../../platforms/weibo/weibo-client';

@Injectable()
export class DetailNodeVisitor {
  constructor(private weiboClient: WeiboClient) {}

  @Handler(DetailNodeAst)
  async visit(ast: DetailNodeAst, ctx: any) {
    ast.state = 'running';

    try {
      if (!ast.postId) {
        throw new NoRetryError('缺少必要参数: postId');
      }

      const detail = await this.weiboClient.getDetail(ast.postId);
      ast.detail = detail;

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      setAstError(ast, error instanceof Error ? error : new Error(String(error)), process.env.NODE_ENV === 'development');
    }

    return ast;
  }
}
