import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote';

/**
 * 热门微博浏览器端执行器
 */
@Injectable()
export class WeiboAccountPickAstBrowserVisitor {
  @Handler(WeiboAccountPickAst)
  handler(ast: WeiboAccountPickAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}