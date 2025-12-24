import { Injectable, NoRetryError } from '@sker/core';
import { Handler, setAstError } from '@sker/workflow';
import { SearchNodeAst } from '../nodes/search-node';
import { WeiboClient } from '../../platforms/weibo/weibo-client';

@Injectable()
export class SearchNodeVisitor {
  constructor(private weiboClient: WeiboClient) {}

  @Handler(SearchNodeAst)
  async visit(ast: SearchNodeAst, ctx: any) {
    ast.state = 'running';

    try {
      if (!ast.keyword) {
        throw new NoRetryError('缺少必要参数: keyword');
      }

      const results = await this.weiboClient.search({
        keyword: ast.keyword,
        page: ast.page
      });

      ast.postIds = results.map((item: any) => item.id);
      ast.isEnd = results.length === 0;
      ast.currentPage = ast.page;

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      setAstError(ast, error instanceof Error ? error : new Error(String(error)), process.env.NODE_ENV === 'development');
    }

    return ast;
  }
}
